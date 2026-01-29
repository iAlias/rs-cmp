-- RS-CMP Database Schema
-- PostgreSQL

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sites_domain ON sites(domain);

-- Consents table
CREATE TABLE IF NOT EXISTS consents (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    categories_json JSONB NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consents_site_id ON consents(site_id);
CREATE INDEX idx_consents_timestamp ON consents(timestamp);
CREATE INDEX idx_consents_site_timestamp ON consents(site_id, timestamp);

-- Cookie scans table
CREATE TABLE IF NOT EXISTS scans (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    cookies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scans_site_id ON scans(site_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sites table
CREATE TRIGGER update_sites_updated_at 
    BEFORE UPDATE ON sites 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
