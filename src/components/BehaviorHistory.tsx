import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface BehaviorHistoryProps {
  records: any[];
}

interface GroupedRecord {
  timestamp: string;
  inputs: {
    total_logins: number;
    total_access: number;
    failed_logins: number;
  };
  algorithms: {
    kmeans?: { distance: number; is_anomaly: boolean };
    dbscan?: { distance: number; is_anomaly: boolean };
    iforest?: { distance: number; is_anomaly: boolean };
  };
}

export function BehaviorHistory({ records }: BehaviorHistoryProps) {
  // Group records by timestamp (within 2 seconds) to show all algorithm results together
  const groupedRecords: GroupedRecord[] = [];
  
  records.forEach((record) => {
    const recordTime = new Date(record.timestamp).getTime();
    const existingGroup = groupedRecords.find(
      (group) => Math.abs(new Date(group.timestamp).getTime() - recordTime) < 2000
    );

    if (existingGroup) {
      const algo = record.detected_by_algorithm?.toLowerCase() || 'kmeans';
      existingGroup.algorithms[algo as keyof typeof existingGroup.algorithms] = {
        distance: record.distance,
        is_anomaly: record.is_anomaly,
      };
    } else {
      const algo = record.detected_by_algorithm?.toLowerCase() || 'kmeans';
      groupedRecords.push({
        timestamp: record.timestamp,
        inputs: {
          total_logins: record.total_logins,
          total_access: record.total_access,
          failed_logins: record.failed_logins,
        },
        algorithms: {
          [algo]: {
            distance: record.distance,
            is_anomaly: record.is_anomaly,
          },
        },
      });
    }
  });

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
                <TableHead>Logins</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead className="text-center">K-Means</TableHead>
                <TableHead className="text-center">DBSCAN</TableHead>
                <TableHead className="text-center">Isolation Forest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No records yet. Check a behavior or start streaming.
                  </TableCell>
                </TableRow>
              ) : (
                groupedRecords.map((group, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(group.timestamp), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>{group.inputs.total_logins}</TableCell>
                    <TableCell>{group.inputs.total_access}</TableCell>
                    <TableCell>{group.inputs.failed_logins}</TableCell>
                    <TableCell className="text-center">
                      {group.algorithms.kmeans ? (
                        <div className="space-y-1">
                          <Badge 
                            variant={group.algorithms.kmeans.is_anomaly ? 'destructive' : 'default'}
                            className={group.algorithms.kmeans.is_anomaly ? '' : 'bg-accent text-accent-foreground'}
                          >
                            {group.algorithms.kmeans.is_anomaly ? '⚠️ Anomaly' : '✓ Normal'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {group.algorithms.kmeans.distance.toFixed(4)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {group.algorithms.dbscan ? (
                        <div className="space-y-1">
                          <Badge 
                            variant={group.algorithms.dbscan.is_anomaly ? 'destructive' : 'default'}
                            className={group.algorithms.dbscan.is_anomaly ? '' : 'bg-accent text-accent-foreground'}
                          >
                            {group.algorithms.dbscan.is_anomaly ? '⚠️ Anomaly' : '✓ Normal'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {group.algorithms.dbscan.distance.toFixed(4)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {group.algorithms.iforest ? (
                        <div className="space-y-1">
                          <Badge 
                            variant={group.algorithms.iforest.is_anomaly ? 'destructive' : 'default'}
                            className={group.algorithms.iforest.is_anomaly ? '' : 'bg-accent text-accent-foreground'}
                          >
                            {group.algorithms.iforest.is_anomaly ? '⚠️ Anomaly' : '✓ Normal'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {group.algorithms.iforest.distance.toFixed(4)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
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