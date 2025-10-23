import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function scaleFeatures(features: number[], mean: number[], std: number[]): number[] {
  return features.map((val, i) => (val - mean[i]) / std[i]);
}

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: any = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx];
    });
    records.push(record);
  }
  
  return records;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const csvText = await file.text();
    const records = parseCSV(csvText);

    console.log(`Processing ${records.length} records from CSV`);

    let anomalies = 0;
    let normal = 0;
    const batchInserts = [];
    const algorithms = ['kmeans', 'dbscan', 'iforest'];
    
    // Validate CSV columns using first available model
    const { data: sampleModel } = await supabaseClient
      .from('model_config')
      .select('features_list')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    if (!sampleModel) {
      return new Response(
        JSON.stringify({ error: 'No trained models found. Please train the models first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requiredFields = sampleModel.features_list;
    const sampleRecord = records[0];
    const missingFields = requiredFields.filter((field: string) => !sampleRecord.hasOwnProperty(field));

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `CSV missing required columns: [${missingFields.join(', ')}]` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each record with all 3 algorithms
    for (const record of records) {
      try {
        const features = requiredFields.map((f: string) => parseFloat(record[f]));

        // Check with all 3 algorithms
        for (const algo of algorithms) {
          const { data: modelData, error: modelError } = await supabaseClient
            .from('model_config')
            .select('*')
            .eq('is_active', true)
            .eq('algorithm', algo)
            .maybeSingle();

          if (modelError || !modelData) {
            console.error(`Model for ${algo} not found, skipping`);
            continue;
          }

          const algoScalerMean = modelData.scaler_mean as number[];
          const algoScalerStd = modelData.scaler_std as number[];
          const algoCentroids = modelData.centroids as number[][];
          const algoThreshold = modelData.threshold;

          // Scale features
          const scaledFeatures = features.map((val: number, idx: number) => 
            (val - algoScalerMean[idx]) / algoScalerStd[idx]
          );

          let distance = 0;
          let isAnomaly = false;

          // Algorithm-specific scoring
          if (algo === 'kmeans') {
            const distances = algoCentroids.map((centroid: number[]) => 
              euclideanDistance(scaledFeatures, centroid)
            );
            distance = Math.min(...distances);
            isAnomaly = distance > algoThreshold;
          } else if (algo === 'dbscan') {
            distance = scaledFeatures.reduce((sum: number, val: number) => sum + Math.abs(val), 0) / scaledFeatures.length;
            isAnomaly = distance > (modelData.dbscan_eps || 1.5);
          } else if (algo === 'iforest') {
            distance = scaledFeatures.reduce((sum: number, val: number) => sum + val * val, 0) / scaledFeatures.length;
            isAnomaly = distance > algoThreshold;
          }

          if (isAnomaly) anomalies++;
          else normal++;

          batchInserts.push({
            timestamp: new Date().toISOString(),
            total_logins: parseInt(record.total_logins),
            total_access: parseInt(record.total_access),
            failed_logins: parseInt(record.failed_logins),
            unique_resources: parseInt(record.unique_resources),
            avg_daily_access: parseFloat(record.avg_daily_access),
            avg_bytes: parseFloat(record.avg_bytes),
            distance: distance,
            is_anomaly: isAnomaly,
            detected_by_algorithm: algo
          });
        }
      } catch (parseError) {
        console.error('Error processing record:', parseError);
        continue;
      }
    }

    // Batch insert
    const { error: insertError } = await supabaseClient
      .from('behavior_records')
      .insert(batchInserts);

    if (insertError) {
      console.error('Batch insert error:', insertError);
      throw insertError;
    }

    console.log(`Bulk prediction complete: ${anomalies} anomalies, ${normal} normal`);

    return new Response(
      JSON.stringify({
        total_records: records.length,
        anomalies,
        normal
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Bulk prediction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});