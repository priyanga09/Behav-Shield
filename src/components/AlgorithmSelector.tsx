import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AlgorithmSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AlgorithmSelector = ({ value, onChange, disabled }: AlgorithmSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="algorithm">Detection Algorithm</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="algorithm">
          <SelectValue placeholder="Select algorithm" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="kmeans">K-Means Clustering</SelectItem>
          <SelectItem value="dbscan">DBSCAN (Density-Based)</SelectItem>
          <SelectItem value="iforest">Isolation Forest</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        {value === 'kmeans' && 'Distance-based clustering for anomaly detection'}
        {value === 'dbscan' && 'Density-based clustering finds outliers as noise points'}
        {value === 'iforest' && 'Tree-based algorithm isolates anomalies efficiently'}
      </p>
    </div>
  );
};
