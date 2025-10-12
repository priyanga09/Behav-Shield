import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface BehaviorHistoryProps {
  records: any[];
}

export function BehaviorHistory({ records }: BehaviorHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection History</CardTitle>
        <CardDescription>Recent behavior analysis results (latest 50 records)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logins</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No records yet. Check a behavior or start streaming.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(record.timestamp), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>{record.distance.toFixed(4)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={record.is_anomaly ? 'destructive' : 'default'}
                        className={record.is_anomaly ? '' : 'bg-accent text-accent-foreground'}
                      >
                        {record.is_anomaly ? '⚠️ Anomaly' : '✓ Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.total_logins}</TableCell>
                    <TableCell>{record.total_access}</TableCell>
                    <TableCell>{record.failed_logins}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}