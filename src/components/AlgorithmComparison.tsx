import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

interface ComparisonResult {
  algorithm: string;
  score: number;
  is_anomaly: boolean;
  message: string;
}

interface AlgorithmComparisonProps {
  results: ComparisonResult[];
}

export const AlgorithmComparison = ({ results }: AlgorithmComparisonProps) => {
  if (results.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Algorithm Comparison Results
        </CardTitle>
        <CardDescription>
          See how each algorithm classified this behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((result) => (
            <div
              key={result.algorithm}
              className={`p-4 rounded-lg border-2 transition-all ${
                result.is_anomaly
                  ? 'border-destructive bg-destructive/5'
                  : 'border-green-500 bg-green-500/5'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">
                  {result.algorithm.toUpperCase()}
                </h3>
                {result.is_anomaly ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge
                    variant={result.is_anomaly ? "destructive" : "default"}
                    className={result.is_anomaly ? "" : "bg-green-500 hover:bg-green-600"}
                  >
                    {result.is_anomaly ? "Anomaly" : "Normal"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className="font-mono font-semibold">
                    {result.score.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Different algorithms use different detection methods:
          </p>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
            <li>• <strong>K-Means:</strong> Distance to cluster centers</li>
            <li>• <strong>DBSCAN:</strong> Density-based outlier detection</li>
            <li>• <strong>Isolation Forest:</strong> Ease of point isolation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
