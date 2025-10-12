import { useState, useEffect } from "react";
import { BehaviorForm } from "@/components/BehaviorForm";
import { BehaviorHistory } from "@/components/BehaviorHistory";
import { BehaviorChart } from "@/components/BehaviorChart";
import { StreamControls } from "@/components/StreamControls";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [modelTrained, setModelTrained] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamInterval, setStreamInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if model is trained
    checkModelStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('behavior_records_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'behavior_records'
        },
        (payload) => {
          console.log('New record:', payload.new);
          setRecords(prev => [payload.new, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    // Load initial history
    loadHistory();

    return () => {
      supabase.removeChannel(channel);
      if (streamInterval) clearInterval(streamInterval);
    };
  }, []);

  const checkModelStatus = async () => {
    const { data } = await supabase
      .from('model_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    
    setModelTrained(!!data);
  };

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('behavior_records')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading history:', error);
    } else {
      setRecords(data || []);
    }
  };

  const trainModel = async () => {
    setIsTraining(true);
    try {
      const response = await supabase.functions.invoke('train-model', {
        body: {}
      });

      if (response.error) throw response.error;

      toast.success('Model trained successfully!');
      setModelTrained(true);
    } catch (error) {
      console.error('Training error:', error);
      toast.error('Failed to train model');
    } finally {
      setIsTraining(false);
    }
  };

  const startStream = async () => {
    const { data, error } = await supabase.functions.invoke('stream-control', {
      body: { action: 'start' }
    });

    if (error) {
      toast.error('Failed to start stream');
      return;
    }

    setIsStreaming(true);
    toast.success('Stream started');

    // Client-side simulation
    const interval = setInterval(async () => {
      const isAnomaly = Math.random() < 0.2;
      
      const record = isAnomaly ? {
        total_logins: Math.floor(Math.random() * 50 + 100),
        total_access: Math.floor(Math.random() * 200 + 500),
        failed_logins: Math.floor(Math.random() * 20 + 10),
        unique_resources: Math.floor(Math.random() * 100 + 200),
        avg_daily_access: Math.random() * 100 + 150,
        avg_bytes: Math.random() * 5000000 + 10000000,
      } : {
        total_logins: Math.floor(Math.random() * 20 + 5),
        total_access: Math.floor(Math.random() * 100 + 50),
        failed_logins: Math.floor(Math.random() * 3),
        unique_resources: Math.floor(Math.random() * 30 + 10),
        avg_daily_access: Math.random() * 50 + 20,
        avg_bytes: Math.random() * 1000000 + 1000000,
      };

      await supabase.functions.invoke('predict', {
        body: record
      });
    }, 3000);

    setStreamInterval(interval);
  };

  const stopStream = async () => {
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }

    await supabase.functions.invoke('stream-control', {
      body: { action: 'stop' }
    });

    setIsStreaming(false);
    toast.success('Stream stopped');
  };

  const clearHistory = async () => {
    const { error } = await supabase
      .from('behavior_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      toast.error('Failed to clear history');
    } else {
      setRecords([]);
      toast.success('History cleared from database');
    }
  };

  const clearLocalHistory = () => {
    setRecords([]);
    toast.success('Local view cleared (database unchanged)');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            BehavShield
          </h1>
          <p className="text-xl text-muted-foreground">
            User Behavior Anomaly Detection with K-Means Clustering
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              onClick={trainModel} 
              disabled={isTraining || modelTrained}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
            >
              {isTraining ? 'Training...' : modelTrained ? 'Model Trained ✓' : 'Train Model'}
            </Button>
            <Button 
              onClick={clearLocalHistory} 
              variant="outline"
              size="lg"
            >
              Clear Local View
            </Button>
            <Button 
              onClick={clearHistory} 
              variant="destructive"
              size="lg"
            >
              Clear Database
            </Button>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <BehaviorForm modelTrained={modelTrained} />
            <StreamControls 
              isStreaming={isStreaming}
              onStart={startStream}
              onStop={stopStream}
              modelTrained={modelTrained}
            />
          </div>

          <div className="space-y-6">
            <BehaviorChart records={records} />
          </div>
        </div>

        <BehaviorHistory records={records} />
      </div>
    </div>
  );
};

export default Index;
