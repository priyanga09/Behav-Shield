import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, StopCircle } from "lucide-react";

interface StreamControlsProps {
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
  modelTrained: boolean;
}

export function StreamControls({ isStreaming, onStart, onStop, modelTrained }: StreamControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Stream Simulation
          <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </CardTitle>
        <CardDescription>
          {isStreaming ? 'Live simulation running' : 'Start automated behavior testing'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={onStart}
            disabled={isStreaming || !modelTrained}
            className="flex-1"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Stream
          </Button>
          <Button
            onClick={onStop}
            disabled={!isStreaming}
            variant="outline"
            className="flex-1"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Stop Stream
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Simulated stream generates behavior records every 3 seconds with ~20% anomaly rate
        </p>
      </CardContent>
    </Card>
  );
}