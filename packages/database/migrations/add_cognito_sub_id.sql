-- Migration: Add cognito_sub_id column to users table
-- This column stores the Cognito user's sub (subject) claim from JWT tokens
-- It allows linking Cognito authentication to application user records

ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_sub_id VARCHAR(255);

-- Create unique index on cognito_sub_id for fast lookups and ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cognito_sub_id ON users (cognito_sub_id) WHERE cognito_sub_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN users.cognito_sub_id IS 'Cognito user sub claim (UUID) - unique identifier from AWS Cognito User Pool';
