-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50) UNIQUE NOT NULL,
  label      VARCHAR(100) NOT NULL,
  access     JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed roles
INSERT INTO roles (name, label, access) VALUES
(
  'superadmin', 'Super Admin',
  '["home","bookings","services","blogs","my_assignments","customers","transactions","team","membership","workshops","vedic_programs","set_password"]'
),
(
  'co_admin', 'Co-Admin',
  '["home","bookings","services","blogs","my_assignments","customers","transactions","team","membership","workshops","vedic_programs","set_password"]'
),
(
  'doctor', 'Doctor',
  '["home","bookings","services","blogs","my_assignments","set_password"]'
),
(
  'therapist', 'Therapist',
  '["home","bookings","blogs","my_assignments","set_password"]'
);

-- ============================================================
-- 2. TEAM MEMBERS
-- ============================================================
CREATE TABLE team_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  phone      VARCHAR(20),
  role_id    INTEGER NOT NULL REFERENCES roles(id),
  avatar_url TEXT,
  status     VARCHAR(20) DEFAULT 'pending'
               CHECK (status IN ('pending','active','inactive')),
  created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. LOGIN CREDENTIALS
-- ============================================================
CREATE TABLE login_credentials (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id          UUID NOT NULL UNIQUE REFERENCES team_members(id) ON DELETE CASCADE,
  password_hash      TEXT,
  temp_password_hash TEXT,
  must_change        BOOLEAN DEFAULT TRUE,
  reset_token        TEXT,
  reset_token_expiry TIMESTAMPTZ,
  last_login         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. OTP VERIFICATION
-- ============================================================
CREATE TABLE otp_verification (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  otp_code   VARCHAR(6) NOT NULL,
  otp_type   VARCHAR(30) DEFAULT 'login'
               CHECK (otp_type IN ('login','password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  attempts   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. SESSION LOG
-- ============================================================
CREATE TABLE session_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  event      VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_team_members_email  ON team_members(email);
CREATE INDEX idx_team_members_role   ON team_members(role_id);
CREATE INDEX idx_otp_member_type     ON otp_verification(member_id, otp_type);
CREATE INDEX idx_credentials_member  ON login_credentials(member_id);
CREATE INDEX idx_credentials_token   ON login_credentials(reset_token);

-- ============================================================
-- AUTO UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_members_updated
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_credentials_updated
  BEFORE UPDATE ON login_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Default Superadmin
-- ============================================================
WITH new_member AS (
  INSERT INTO team_members (first_name, last_name, email, role_id, status)
  VALUES ('Super', 'Admin', 'admin@tapovana.com',
          (SELECT id FROM roles WHERE name = 'superadmin'), 'active')
  RETURNING id
)
INSERT INTO login_credentials (member_id, password_hash, must_change)
SELECT id,
       crypt('Pr@sh22N@gu29', gen_salt('bf', 12)),
       FALSE
FROM new_member;