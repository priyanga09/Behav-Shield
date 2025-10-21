import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ModelMetrics {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_time_ms: number;
}

export const ModelComparison = () => {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('model_config')
        .select('algorithm, accuracy, precision_score, recall_score, f1_score, training_time_ms')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedMetrics = data.map(d => ({
          algorithm: d.algorithm.toUpperCase(),
          accuracy: (d.accuracy || 0) * 100,
          precision: (d.precision_score || 0) * 100,
          recall: (d.recall_score || 0) * 100,
          f1_score: (d.f1_score || 0) * 100,
          training_time_ms: d.training_time_ms || 0,
        }));
        setMetrics(formattedMetrics);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading comparison metrics...</p>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No trained models found. Train models to see comparison.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Model Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="algorithm" />
            <YAxis label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="accuracy" fill="#8b5cf6" name="Accuracy" />
            <Bar dataKey="precision" fill="#10b981" name="Precision" />
            <Bar dataKey="recall" fill="#f59e0b" name="Recall" />
            <Bar dataKey="f1_score" fill="#ef4444" name="F1 Score" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Training Time Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="algorithm" />
            <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="training_time_ms" fill="#3b82f6" name="Training Time" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Detailed Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Algorithm</th>
                <th className="text-right p-2">Accuracy</th>
                <th className="text-right p-2">Precision</th>
                <th className="text-right p-2">Recall</th>
                <th className="text-right p-2">F1 Score</th>
                <th className="text-right p-2">Training Time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.algorithm} className="border-b">
                  <td className="p-2 font-semibold">{metric.algorithm}</td>
                  <td className="text-right p-2">{metric.accuracy.toFixed(2)}%</td>
                  <td className="text-right p-2">{metric.precision.toFixed(2)}%</td>
                  <td className="text-right p-2">{metric.recall.toFixed(2)}%</td>
                  <td className="text-right p-2">{metric.f1_score.toFixed(2)}%</td>
                  <td className="text-right p-2">{metric.training_time_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
