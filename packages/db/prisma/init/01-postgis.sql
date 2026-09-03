-- Initialize PostGIS extension (already done by postgis/postgis base image,
-- but included here for explicit documentation and safety check)
CREATE EXTENSION IF NOT EXISTS postgis;
