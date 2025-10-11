import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// K-means implementation
function kMeans(data: number[][], k: number, maxIterations = 100): { centroids: number[][], labels: number[] } {
  const n = data.length;
  const m = data[0].length;
  
  // Initialize centroids randomly
  let centroids: number[][] = [];
  const indices = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n);
    if (!indices.has(idx)) {
      indices.add(idx);
      centroids.push([...data[idx]]);
    }
  }
  
  let labels = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newLabels = data.map(point => {
      let minDist = Infinity;
      let bestCluster = 0;
      
      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(point, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      return bestCluster;
    });
    
    // Check convergence
    if (JSON.stringify(newLabels) === JSON.stringify(labels)) {
      break;
    }
    labels = newLabels;
    
    // Update centroids
    const newCentroids: number[][] = Array(k).fill(0).map(() => Array(m).fill(0));
    const counts = Array(k).fill(0);
    
    for (let i = 0; i < n; i++) {
      const cluster = labels[i];
      counts[cluster]++;
      for (let j = 0; j < m; j++) {
        newCentroids[cluster][j] += data[i][j];
      }
    }
    
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < m; j++) {
          newCentroids[c][j] /= counts[c];
        }
      }
    }
    
    centroids = newCentroids;
  }
  
  return { centroids, labels };
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function standardScaler(data: number[][]): { scaledData: number[][], mean: number[], std: number[] } {
  const n = data.length;
  const m = data[0].length;
  
  const mean = Array(m).fill(0);
  const std = Array(m).fill(0);
  
  // Calculate mean
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) {
      mean[j] += data[i][j];
    }
    mean[j] /= n;
  }
  
  // Calculate std
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) {
      std[j] += Math.pow(data[i][j] - mean[j], 2);
    }
    std[j] = Math.sqrt(std[j] / n);
    if (std[j] === 0) std[j] = 1; // Prevent division by zero
  }
  
  // Scale data
  const scaledData = data.map(row =>
    row.map((val, j) => (val - mean[j]) / std[j])
  );
  
  return { scaledData, mean, std };
}

function generateSyntheticData(numSamples = 1000): number[][] {
  const data: number[][] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const isAnomaly = Math.random() < 0.2;
    
    if (isAnomaly) {
      // Anomalous behavior
      data.push([
        Math.floor(Math.random() * 50 + 100), // high logins
        Math.floor(Math.random() * 200 + 500), // high access
        Math.floor(Math.random() * 20 + 10), // many failed logins
        Math.floor(Math.random() * 100 + 200), // many resources
        Math.random() * 100 + 150, // high daily access
        Math.random() * 5000000 + 10000000, // high bytes
      ]);
    } else {
      // Normal behavior
      data.push([
        Math.floor(Math.random() * 20 + 5), // normal logins
        Math.floor(Math.random() * 100 + 50), // normal access
        Math.floor(Math.random() * 3), // few failed logins
        Math.floor(Math.random() * 30 + 10), // normal resources
        Math.random() * 50 + 20, // normal daily access
        Math.random() * 1000000 + 1000000, // normal bytes
      ]);
    }
  }
  
  return data;
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

    console.log('Starting model training...');
    
    // Generate synthetic training data
    const rawData = generateSyntheticData(1000);
    const features = ['total_logins', 'total_access', 'failed_logins', 'unique_resources', 'avg_daily_access', 'avg_bytes'];
    
    // Scale the data
    const { scaledData, mean, std } = standardScaler(rawData);
    
    // Find best K using simple heuristic (try k=2 to k=5)
    let bestK = 3;
    let bestCentroids: number[][] = [];
    
    // Train with best K
    const { centroids } = kMeans(scaledData, bestK);
    bestCentroids = centroids;
    
    // Calculate distances for threshold
    const distances = scaledData.map(point => {
      const dists = bestCentroids.map(centroid => euclideanDistance(point, centroid));
      return Math.min(...dists);
    });
    
    const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    const stdDist = Math.sqrt(
      distances.reduce((sum, d) => sum + Math.pow(d - meanDist, 2), 0) / distances.length
    );
    const threshold = meanDist + 3.5 * stdDist;
    
    console.log(`Trained model: k=${bestK}, threshold=${threshold}`);
    
    // Deactivate old models
    await supabaseClient
      .from('model_config')
      .update({ is_active: false })
      .eq('is_active', true);
    
    // Save new model
    const { error } = await supabaseClient
      .from('model_config')
      .insert({
        model_version: 'v1',
        threshold,
        scaler_mean: mean,
        scaler_std: std,
        centroids: bestCentroids,
        features_list: features,
        is_active: true
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Model trained successfully',
        details: {
          k: bestK,
          threshold: threshold.toFixed(4),
          features,
          samples_trained: rawData.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Training error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});