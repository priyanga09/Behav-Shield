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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    const { total_logins, total_access, failed_logins, unique_resources, avg_daily_access, avg_bytes } = body;

    // Validate input
    const requiredFields = ['total_logins', 'total_access', 'failed_logins', 'unique_resources', 'avg_daily_access', 'avg_bytes'];
    const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid input: missing fields [${missingFields.join(', ')}]` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received prediction request:', body);

    // Load active model
    const { data: modelData, error: modelError } = await supabaseClient
      .from('model_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (modelError || !modelData) {
      return new Response(
        JSON.stringify({ error: 'No trained model found. Please train the model first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { threshold, scaler_mean, scaler_std, centroids } = modelData;

    // Scale features
    const features = [total_logins, total_access, failed_logins, unique_resources, avg_daily_access, avg_bytes];
    const scaledFeatures = scaleFeatures(features, scaler_mean, scaler_std);

    // Calculate distance to nearest centroid
    const distances = centroids.map((centroid: number[]) => euclideanDistance(scaledFeatures, centroid));
    const minDistance = Math.min(...distances);

    const isAnomaly = minDistance > threshold;
    const timestamp = new Date().toISOString();

    // Insert record
    const { error: insertError } = await supabaseClient
      .from('behavior_records')
      .insert({
        timestamp,
        total_logins,
        total_access,
        failed_logins,
        unique_resources,
        avg_daily_access,
        avg_bytes,
        distance: minDistance,
        is_anomaly: isAnomaly
      });

    if (insertError) {
      console.error('Insert error:', insertError);
    }

    const message = isAnomaly 
      ? `⚠️ Anomaly Detected (Distance: ${minDistance.toFixed(4)})`
      : `✅ Normal Behavior (Distance: ${minDistance.toFixed(4)})`;

    console.log('Prediction result:', message);

    return new Response(
      JSON.stringify({
        timestamp,
        distance: minDistance,
        is_anomaly: isAnomaly,
        message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Prediction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});