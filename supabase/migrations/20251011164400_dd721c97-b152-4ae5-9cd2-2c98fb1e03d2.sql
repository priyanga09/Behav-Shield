-- Create table for storing behavior records and detections
CREATE TABLE public.behavior_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_logins INTEGER NOT NULL,
  total_access INTEGER NOT NULL,
  failed_logins INTEGER NOT NULL,
  unique_resources INTEGER NOT NULL,
  avg_daily_access DOUBLE PRECISION NOT NULL,
  avg_bytes DOUBLE PRECISION NOT NULL,
  distance DOUBLE PRECISION NOT NULL,
  is_anomaly BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for storing model configuration
CREATE TABLE public.model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL DEFAULT 'v1',
  threshold DOUBLE PRECISION NOT NULL,
  scaler_mean JSONB NOT NULL,
  scaler_std JSONB NOT NULL,
  centroids JSONB NOT NULL,
  features_list JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create index for faster queries
CREATE INDEX idx_behavior_records_timestamp ON public.behavior_records(timestamp DESC);
CREATE INDEX idx_behavior_records_is_anomaly ON public.behavior_records(is_anomaly);
CREATE INDEX idx_model_config_active ON public.model_config(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_config ENABLE ROW LEVEL SECURITY;

-- Create policies (public read for demo purposes, adjust as needed)
CREATE POLICY "Allow public read access to behavior records"
  ON public.behavior_records FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to behavior records"
  ON public.behavior_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to model config"
  ON public.model_config FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to model config"
  ON public.model_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to model config"
  ON public.model_config FOR UPDATE
  USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.behavior_records;