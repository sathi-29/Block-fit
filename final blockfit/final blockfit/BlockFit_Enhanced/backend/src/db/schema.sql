CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50),
  phone VARCHAR(30),
  name VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  account_type VARCHAR(30) NOT NULL DEFAULT 'patient',
  clinician_verified_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  exercise_slug VARCHAR(100),
  status VARCHAR(30) DEFAULT 'completed',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  valid_reps INTEGER NOT NULL DEFAULT 0,
  invalid_reps INTEGER NOT NULL DEFAULT 0,
  form_score INTEGER NOT NULL DEFAULT 0,
  performance_score INTEGER NOT NULL DEFAULT 0,
  confidence DECIMAL(5,4) DEFAULT 0,
  workout_id VARCHAR(255) UNIQUE,
  sequence_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS exercise_slug VARCHAR(100);

CREATE TABLE IF NOT EXISTS rom_measurements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id VARCHAR(255) NOT NULL REFERENCES workouts(workout_id) ON DELETE CASCADE,
  exercise_slug VARCHAR(100) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('left', 'right')),
  camera_view VARCHAR(10) NOT NULL CHECK (camera_view IN ('front', 'side')),
  measured_value NUMERIC(6,2) NOT NULL CHECK (measured_value >= 0 AND measured_value <= 180),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  engine_version VARCHAR(40) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rom_measurements_user_exercise_time
  ON rom_measurements (user_id, exercise_slug, recorded_at DESC);

CREATE TABLE IF NOT EXISTS exercise_results (
  id UUID PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  valid_reps INTEGER NOT NULL DEFAULT 0,
  invalid_reps INTEGER NOT NULL DEFAULT 0,
  form_score INTEGER NOT NULL DEFAULT 0,
  performance_score INTEGER NOT NULL DEFAULT 0,
  issues JSONB,
  confidence DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_issues (
  id UUID PRIMARY KEY,
  exercise_result_id UUID REFERENCES exercise_results(id) ON DELETE CASCADE,
  issue_code VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(30) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  badge_name VARCHAR(150) NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  verification_id VARCHAR(255) UNIQUE NOT NULL,
  hash_value TEXT NOT NULL,
  integrity_hmac TEXT,
  transaction_hash TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exercise_slug VARCHAR(100),
  valid_reps INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  credential_status VARCHAR(30) DEFAULT 'VERIFIED',
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS landmark_streams (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at TIMESTAMP WITH TIME ZONE,
  sample_rate_hz DECIMAL(6,2) NOT NULL DEFAULT 10,
  encoding VARCHAR(30) NOT NULL DEFAULT 'quantized-json',
  stream_data JSONB NOT NULL,
  retention_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (consent_given = TRUE AND consented_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS workout_nonces (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nonce_hash TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS account_sequences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  next_sequence BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject_type VARCHAR(50) NOT NULL,
  subject_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  previous_event_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landmark_streams_retention
  ON landmark_streams (retention_expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_subject
  ON audit_events (subject_type, subject_id, created_at);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS username VARCHAR(50),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(30) NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS clinician_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS clinician_connections (
  id UUID PRIMARY KEY,
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinician_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invite_code_hash TEXT NOT NULL UNIQUE,
  status VARCHAR(40) NOT NULL CHECK (status IN ('invited', 'awaiting_patient_approval', 'approved', 'revoked', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinician_connections_patient_status
  ON clinician_connections (patient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_clinician_connections_clinician_status
  ON clinician_connections (clinician_user_id, status);

CREATE TABLE IF NOT EXISTS rehabilitation_programs (
  id UUID PRIMARY KEY,
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinician_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  exercises JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rehabilitation_programs_patient_status
  ON rehabilitation_programs (patient_user_id, status, created_at DESC);

UPDATE users
SET username = LOWER(LEFT(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_.-]', '', 'g'), 40)) || '_' || LEFT(REPLACE(id::text, '-', ''), 8)
WHERE username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS sequence_number BIGINT;

ALTER TABLE verification_records
  ADD COLUMN IF NOT EXISTS integrity_hmac TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY,
  verification_id UUID REFERENCES verification_records(id) ON DELETE CASCADE,
  network VARCHAR(50) NOT NULL,
  transaction_hash TEXT NOT NULL,
  status VARCHAR(40) DEFAULT 'pending',
  block_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
