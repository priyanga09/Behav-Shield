import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { AlgorithmSelector } from "./AlgorithmSelector";
import { AlgorithmComparison } from "./AlgorithmComparison";

interface BehaviorFormProps {
  modelTrained: boolean;
}

export function BehaviorForm({ modelTrained }: BehaviorFormProps) {
  const [formData, setFormData] = useState({
    total_logins: "",
    total_access: "",
    failed_logins: "",
    unique_resources: "",
    avg_daily_access: "",
    avg_bytes: ""
  });
  const [algorithm, setAlgorithm] = useState("kmeans");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);
  const [checkMode, setCheckMode] = useState<"all" | "kmeans">("all");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modelTrained) {
      toast.error('Please train the model first');
      return;
    }

    setIsSubmitting(true);
    try {
      const inputData = {
        total_logins: parseInt(formData.total_logins),
        total_access: parseInt(formData.total_access),
        failed_logins: parseInt(formData.failed_logins),
        unique_resources: parseInt(formData.unique_resources),
        avg_daily_access: parseFloat(formData.avg_daily_access),
        avg_bytes: parseFloat(formData.avg_bytes),
      };

      // Run predictions based on mode
      const algorithms = checkMode === "all" ? ['kmeans', 'dbscan', 'iforest'] : ['kmeans'];
      const results = [];

      for (const algo of algorithms) {
        const { data, error } = await supabase.functions.invoke('predict', {
          body: { ...inputData, algorithm: algo }
        });

        if (!error && data) {
          results.push({
            algorithm: algo,
            score: data.score,
            is_anomaly: data.is_anomaly,
            message: data.message
          });
        }
      }

      setComparisonResults(results);
      
      // Show summary toast
      if (checkMode === "all") {
        const anomalyCount = results.filter(r => r.is_anomaly).length;
        if (anomalyCount === 3) {
          toast.error('⚠️ All algorithms detected an anomaly!');
        } else if (anomalyCount === 0) {
          toast.success('✅ All algorithms classify as normal behavior');
        } else {
          toast.warning(`${anomalyCount}/3 algorithms detected an anomaly`);
        }
      } else {
        const result = results[0];
        if (result.is_anomaly) {
          toast.error(`⚠️ K-Means detected an anomaly! Score: ${result.score.toFixed(4)}`);
        } else {
          toast.success(`✅ K-Means: Normal behavior (Score: ${result.score.toFixed(4)})`);
        }
      }
      
      // Reset form
      setFormData({
        total_logins: "",
        total_access: "",
        failed_logins: "",
        unique_resources: "",
        avg_daily_access: "",
        avg_bytes: ""
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error('Failed to check behavior');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!modelTrained) {
      toast.error('Please train the model first');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('bulk-predict', {
        body: formData
      });

      if (error) throw error;

      toast.success(`Processed ${data.total_records} records: ${data.anomalies} anomalies, ${data.normal} normal`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process CSV');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Check Behavior</CardTitle>
          <CardDescription>Enter user behavior metrics for anomaly detection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Check Mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={checkMode === "all" ? "default" : "outline"}
                onClick={() => setCheckMode("all")}
                className="flex-1"
              >
                All Algorithms
              </Button>
              <Button
                type="button"
                variant={checkMode === "kmeans" ? "default" : "outline"}
                onClick={() => setCheckMode("kmeans")}
                className="flex-1"
              >
                K-Means Only
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {checkMode === "all" 
                ? "Compare all 3 algorithms (K-Means is primary)" 
                : "Check with K-Means algorithm only"}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_logins">Total Logins</Label>
              <Input
                id="total_logins"
                type="number"
                value={formData.total_logins}
                onChange={(e) => setFormData(prev => ({ ...prev, total_logins: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total_access">Total Access</Label>
              <Input
                id="total_access"
                type="number"
                value={formData.total_access}
                onChange={(e) => setFormData(prev => ({ ...prev, total_access: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="failed_logins">Failed Logins</Label>
              <Input
                id="failed_logins"
                type="number"
                value={formData.failed_logins}
                onChange={(e) => setFormData(prev => ({ ...prev, failed_logins: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unique_resources">Unique Resources</Label>
              <Input
                id="unique_resources"
                type="number"
                value={formData.unique_resources}
                onChange={(e) => setFormData(prev => ({ ...prev, unique_resources: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avg_daily_access">Avg Daily Access</Label>
              <Input
                id="avg_daily_access"
                type="number"
                step="0.01"
                value={formData.avg_daily_access}
                onChange={(e) => setFormData(prev => ({ ...prev, avg_daily_access: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avg_bytes">Avg Bytes</Label>
              <Input
                id="avg_bytes"
                type="number"
                step="0.01"
                value={formData.avg_bytes}
                onChange={(e) => setFormData(prev => ({ ...prev, avg_bytes: e.target.value }))}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !modelTrained}>
            {isSubmitting ? 'Checking...' : 'Check Behavior'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-upload">Upload CSV File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading || !modelTrained}
              className="cursor-pointer"
            />
            {isUploading && <span className="text-sm text-muted-foreground">Processing...</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            CSV must include: total_logins, total_access, failed_logins, unique_resources, avg_daily_access, avg_bytes
          </p>
        </div>
      </CardContent>
    </Card>
    
    <AlgorithmComparison results={comparisonResults} />
    </>
  );
}