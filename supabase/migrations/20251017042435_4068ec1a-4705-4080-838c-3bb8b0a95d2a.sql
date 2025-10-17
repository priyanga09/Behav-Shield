-- Add algorithm type column to model_config
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS algorithm TEXT NOT NULL DEFAULT 'kmeans';

-- Add evaluation metrics columns
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION;
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS precision_score DOUBLE PRECISION;
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS recall_score DOUBLE PRECISION;
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS f1_score DOUBLE PRECISION;
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS training_time_ms INTEGER;

-- Add algorithm-specific parameters for DBSCAN
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS dbscan_eps DOUBLE PRECISION;
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS dbscan_min_samples INTEGER;

-- Add algorithm-specific parameters for Isolation Forest
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS iforest_n_estimators INTEGER;
ALTER TABLE model_config ADD COLUMN IF NOT EXISTS iforest_contamination DOUBLE PRECISION;

-- Update behavior_records to store which algorithm detected the anomaly
ALTER TABLE behavior_records ADD COLUMN IF NOT EXISTS detected_by_algorithm TEXT DEFAULT 'kmeans';

-- Create index for faster algorithm queries
CREATE INDEX IF NOT EXISTS idx_model_config_algorithm ON model_config(algorithm, is_active);