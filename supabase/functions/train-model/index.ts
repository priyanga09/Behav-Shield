import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DBSCAN implementation
function dbscan(data: number[][], eps: number, minSamples: number): { labels: number[], nClusters: number } {
  const n = data.length;
  const labels = new Array(n).fill(-1); // -1 means unvisited
  let clusterId = 0;

  function rangeQuery(pointIdx: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (euclideanDistance(data[pointIdx], data[i]) <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    const neighbors = rangeQuery(i);
    if (neighbors.length < minSamples) {
      labels[i] = -2; // Mark as noise
      continue;
    }

    labels[i] = clusterId;
    const seedSet = [...neighbors];

    for (let j = 0; j < seedSet.length; j++) {
      const q = seedSet[j];
      if (labels[q] === -2) labels[q] = clusterId;
      if (labels[q] !== -1) continue;

      labels[q] = clusterId;
      const qNeighbors = rangeQuery(q);
      if (qNeighbors.length >= minSamples) {
        seedSet.push(...qNeighbors);
      }
    }
    clusterId++;
  }

  return { labels, nClusters: clusterId };
}

// Isolation Forest implementation
class IsolationTree {
  splitFeature: number | null = null;
  splitValue: number | null = null;
  left: IsolationTree | null = null;
  right: IsolationTree | null = null;
  size: number = 0;

  constructor(data: number[][], height: number, maxHeight: number) {
    this.size = data.length;

    if (height >= maxHeight || data.length <= 1) {
      return;
    }

    const numFeatures = data[0].length;
    this.splitFeature = Math.floor(Math.random() * numFeatures);

    const values = data.map(row => row[this.splitFeature!]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    if (minVal === maxVal) return;

    this.splitValue = minVal + Math.random() * (maxVal - minVal);

    const leftData = data.filter(row => row[this.splitFeature!] < this.splitValue!);
    const rightData = data.filter(row => row[this.splitFeature!] >= this.splitValue!);

    if (leftData.length > 0) {
      this.left = new IsolationTree(leftData, height + 1, maxHeight);
    }
    if (rightData.length > 0) {
      this.right = new IsolationTree(rightData, height + 1, maxHeight);
    }
  }

  pathLength(point: number[], currentHeight: number): number {
    if (this.splitFeature === null) {
      return currentHeight + this.averagePathLength(this.size);
    }

    if (point[this.splitFeature] < this.splitValue!) {
      return this.left ? this.left.pathLength(point, currentHeight + 1) : currentHeight;
    } else {
      return this.right ? this.right.pathLength(point, currentHeight + 1) : currentHeight;
    }
  }

  averagePathLength(n: number): number {
    if (n <= 1) return 0;
    const H = Math.log(n - 1) + 0.5772156649; // Euler's constant
    return 2 * H - (2 * (n - 1) / n);
  }
}

class IsolationForest {
  trees: IsolationTree[] = [];
  nEstimators: number;
  maxSamples: number;

  constructor(nEstimators: number = 100, maxSamples: number = 256) {
    this.nEstimators = nEstimators;
    this.maxSamples = maxSamples;
  }

  fit(data: number[][]) {
    const maxHeight = Math.ceil(Math.log2(this.maxSamples));
    for (let i = 0; i < this.nEstimators; i++) {
      const sampleSize = Math.min(this.maxSamples, data.length);
      const sample = this.randomSample(data, sampleSize);
      this.trees.push(new IsolationTree(sample, 0, maxHeight));
    }
  }

  randomSample(data: number[][], size: number): number[][] {
    const sample: number[][] = [];
    for (let i = 0; i < size; i++) {
      const idx = Math.floor(Math.random() * data.length);
      sample.push([...data[idx]]);
    }
    return sample;
  }

  anomalyScore(point: number[]): number {
    const avgPathLength = this.trees.reduce((sum, tree) => 
      sum + tree.pathLength(point, 0), 0) / this.nEstimators;
    const c = this.trees[0].averagePathLength(this.maxSamples);
    return Math.pow(2, -avgPathLength / c);
  }

  predict(data: number[][]): number[] {
    return data.map(point => this.anomalyScore(point));
  }
}

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

    console.log('Starting multi-algorithm model training...');
    const startTime = Date.now();
    
    // Generate synthetic training data
    const rawData = generateSyntheticData(1000);
    const features = ['total_logins', 'total_access', 'failed_logins', 'unique_resources', 'avg_daily_access', 'avg_bytes'];
    
    // Scale the data
    const { scaledData, mean, std } = standardScaler(rawData);
    
    // Generate ground truth labels for evaluation
    const groundTruth = rawData.map(row => {
      const isAnomaly = row[0] > 100 || row[1] > 500 || row[2] > 10;
      return isAnomaly ? 1 : 0;
    });

    const results = [];

    // === TRAIN K-MEANS ===
    console.log('Training K-Means...');
    const kmeansStart = Date.now();
    const bestK = 3;
    const { centroids } = kMeans(scaledData, bestK);
    
    const kmeansDistances = scaledData.map(point => {
      const dists = centroids.map(centroid => euclideanDistance(point, centroid));
      return Math.min(...dists);
    });
    
    const kmeansMeanDist = kmeansDistances.reduce((a, b) => a + b, 0) / kmeansDistances.length;
    const kmeansStdDist = Math.sqrt(
      kmeansDistances.reduce((sum, d) => sum + Math.pow(d - kmeansMeanDist, 2), 0) / kmeansDistances.length
    );
    const kmeansThreshold = kmeansMeanDist + 3.5 * kmeansStdDist;
    
    const kmeansPredictions = kmeansDistances.map(d => d > kmeansThreshold ? 1 : 0);
    const kmeansMetrics = calculateMetrics(groundTruth, kmeansPredictions);
    const kmeansTime = Date.now() - kmeansStart;
    
    await supabaseClient.from('model_config').update({ is_active: false }).eq('algorithm', 'kmeans').eq('is_active', true);
    await supabaseClient.from('model_config').insert({
      algorithm: 'kmeans',
      model_version: 'v1',
      threshold: kmeansThreshold,
      scaler_mean: mean,
      scaler_std: std,
      centroids: centroids,
      features_list: features,
      is_active: true,
      accuracy: kmeansMetrics.accuracy,
      precision_score: kmeansMetrics.precision,
      recall_score: kmeansMetrics.recall,
      f1_score: kmeansMetrics.f1,
      training_time_ms: kmeansTime
    });
    
    results.push({ algorithm: 'K-Means', ...kmeansMetrics, time: kmeansTime });

    // === TRAIN DBSCAN ===
    console.log('Training DBSCAN...');
    const dbscanStart = Date.now();
    const eps = 1.5;
    const minSamples = 5;
    const { labels: dbscanLabels } = dbscan(scaledData, eps, minSamples);
    
    const dbscanPredictions = dbscanLabels.map(label => label === -2 ? 1 : 0);
    const dbscanMetrics = calculateMetrics(groundTruth, dbscanPredictions);
    const dbscanTime = Date.now() - dbscanStart;
    
    await supabaseClient.from('model_config').update({ is_active: false }).eq('algorithm', 'dbscan').eq('is_active', true);
    await supabaseClient.from('model_config').insert({
      algorithm: 'dbscan',
      model_version: 'v1',
      threshold: 0, // DBSCAN doesn't use threshold
      scaler_mean: mean,
      scaler_std: std,
      centroids: [], // Not used by DBSCAN
      features_list: features,
      is_active: true,
      dbscan_eps: eps,
      dbscan_min_samples: minSamples,
      accuracy: dbscanMetrics.accuracy,
      precision_score: dbscanMetrics.precision,
      recall_score: dbscanMetrics.recall,
      f1_score: dbscanMetrics.f1,
      training_time_ms: dbscanTime
    });
    
    results.push({ algorithm: 'DBSCAN', ...dbscanMetrics, time: dbscanTime });

    // === TRAIN ISOLATION FOREST ===
    console.log('Training Isolation Forest...');
    const iforestStart = Date.now();
    const nEstimators = 100;
    const contamination = 0.2;
    const iforest = new IsolationForest(nEstimators, 256);
    iforest.fit(scaledData);
    
    const iforestScores = iforest.predict(scaledData);
    const iforestThreshold = iforestScores.sort((a, b) => b - a)[Math.floor(iforestScores.length * contamination)];
    const iforestPredictions = iforestScores.map(score => score > iforestThreshold ? 1 : 0);
    const iforestMetrics = calculateMetrics(groundTruth, iforestPredictions);
    const iforestTime = Date.now() - iforestStart;
    
    await supabaseClient.from('model_config').update({ is_active: false }).eq('algorithm', 'iforest').eq('is_active', true);
    await supabaseClient.from('model_config').insert({
      algorithm: 'iforest',
      model_version: 'v1',
      threshold: iforestThreshold,
      scaler_mean: mean,
      scaler_std: std,
      centroids: [], // Store tree structure would be too large
      features_list: features,
      is_active: true,
      iforest_n_estimators: nEstimators,
      iforest_contamination: contamination,
      accuracy: iforestMetrics.accuracy,
      precision_score: iforestMetrics.precision,
      recall_score: iforestMetrics.recall,
      f1_score: iforestMetrics.f1,
      training_time_ms: iforestTime
    });
    
    results.push({ algorithm: 'Isolation Forest', ...iforestMetrics, time: iforestTime });

    const totalTime = Date.now() - startTime;
    console.log('All models trained successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All models trained successfully',
        total_time_ms: totalTime,
        results,
        details: {
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

function calculateMetrics(groundTruth: number[], predictions: number[]): any {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  
  for (let i = 0; i < groundTruth.length; i++) {
    if (groundTruth[i] === 1 && predictions[i] === 1) tp++;
    else if (groundTruth[i] === 0 && predictions[i] === 1) fp++;
    else if (groundTruth[i] === 0 && predictions[i] === 0) tn++;
    else if (groundTruth[i] === 1 && predictions[i] === 0) fn++;
  }
  
  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;
  
  return { accuracy, precision, recall, f1 };
}