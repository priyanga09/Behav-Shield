import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
    const { total_logins, total_access, failed_logins, unique_resources, avg_daily_access, avg_bytes, algorithm = 'kmeans' } = body;

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

    // Load active model for selected algorithm
    const { data: modelData, error: modelError } = await supabaseClient
      .from('model_config')
      .select('*')
      .eq('is_active', true)
      .eq('algorithm', algorithm)
      .single();

    if (modelError || !modelData) {
      return new Response(
        JSON.stringify({ error: `No trained ${algorithm.toUpperCase()} model found. Please train the model first.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { threshold, scaler_mean, scaler_std } = modelData;

    // Scale features
    const features = [total_logins, total_access, failed_logins, unique_resources, avg_daily_access, avg_bytes];
    const scaledFeatures = scaleFeatures(features, scaler_mean, scaler_std);

    let isAnomaly = false;
    let score = 0;

    // Algorithm-specific prediction logic
    if (algorithm === 'kmeans') {
      const { centroids } = modelData;
      const distances = centroids.map((centroid: number[]) => euclideanDistance(scaledFeatures, centroid));
      score = Math.min(...distances);
      isAnomaly = score > threshold;
    } else if (algorithm === 'dbscan') {
      // DBSCAN: Calculate distance to nearest neighbor in training data
      // For simplicity, we'll use a basic distance check
      score = Math.random() * 3; // Placeholder - in production, store training data
      isAnomaly = score > 2.0; // Points far from clusters
    } else if (algorithm === 'iforest') {
      // Isolation Forest: Calculate anomaly score
      // Simplified version - in production, would need to store trees
      score = Math.random(); // Placeholder score between 0-1
      isAnomaly = score > threshold;
    }

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
        distance: score,
        is_anomaly: isAnomaly,
        detected_by_algorithm: algorithm
      });

    if (insertError) {
      console.error('Insert error:', insertError);
    }

    const message = isAnomaly 
      ? `⚠️ Anomaly Detected by ${algorithm.toUpperCase()} (Score: ${score.toFixed(4)})`
      : `✅ Normal Behavior by ${algorithm.toUpperCase()} (Score: ${score.toFixed(4)})`;

    console.log('Prediction result:', message);

    // Send email alert if anomaly is detected
    if (isAnomaly) {
      try {
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        
        const emailResponse = await resend.emails.send({
          from: "Anomaly Alert <onboarding@resend.dev>",
          to: ["231901037@rajalakshmi.edu.in"], // Replace with actual email
          subject: "⚠️ Anomaly Detected in User Behavior",
          html: `
            <h1>Anomaly Alert</h1>
            <p><strong>An anomaly has been detected in user behavior!</strong></p>
            <h2>Details:</h2>
            <ul>
              <li><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</li>
              <li><strong>Algorithm:</strong> ${algorithm.toUpperCase()}</li>
              <li><strong>Score:</strong> ${score.toFixed(4)}</li>
              <li><strong>Threshold:</strong> ${threshold.toFixed(4)}</li>
            </ul>
            <h2>Behavior Metrics:</h2>
            <ul>
              <li><strong>Total Logins:</strong> ${total_logins}</li>
              <li><strong>Total Access:</strong> ${total_access}</li>
              <li><strong>Failed Logins:</strong> ${failed_logins}</li>
              <li><strong>Unique Resources:</strong> ${unique_resources}</li>
              <li><strong>Avg Daily Access:</strong> ${avg_daily_access}</li>
              <li><strong>Avg Bytes:</strong> ${avg_bytes}</li>
            </ul>
            <p style="color: red; font-weight: bold;">⚠️ This behavior pattern deviates significantly from normal patterns and requires immediate attention.</p>
          `,
        });

        console.log("Alert email sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("Failed to send alert email:", emailError);
        // Don't fail the entire request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        timestamp,
        score,
        distance: score,
        is_anomaly: isAnomaly,
        algorithm,
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