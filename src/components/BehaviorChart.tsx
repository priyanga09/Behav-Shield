import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface BehaviorChartProps {
  records: any[];
}

export function BehaviorChart({ records }: BehaviorChartProps) {
  const chartData = records
    .slice(0, 20)
    .reverse()
    .map((record, index) => ({
      index: index + 1,
      distance: record.distance,
      anomaly: record.is_anomaly,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distance Trend</CardTitle>
        <CardDescription>Distance to nearest cluster centroid (last 20 records)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="index" 
              label={{ value: 'Record #', position: 'insideBottom', offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              label={{ value: 'Distance', angle: -90, position: 'insideLeft' }}
              className="text-xs"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="distance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.anomaly ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              name="Distance"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}