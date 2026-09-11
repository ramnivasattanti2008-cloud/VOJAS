-- Fix: satellite_observations uniqueness was scoped to (scene_id,
-- observation_date) with no project_id. A Sentinel-2 scene is a single
-- physical satellite pass covering a ~110km tile; two projects whose AOI
-- falls in the same tile legitimately both observe it, but the old
-- constraint let only the first project to ingest a shared scene "claim" the
-- row. Every other project covered by the same tile got a create() that
-- failed with a unique-constraint violation, found nothing on its
-- project-scoped lookup, and recorded a weekly checkpoint as AVAILABLE with
-- observation_id left null.
--
-- Confirmed empirically against the live CDSE catalogue: two seeded
-- Bangalore projects 1.5km apart share a tile, and the second-synced one
-- got 0 of 31 real, found scenes stored under its own project.

ALTER TABLE "satellite_observations"
  DROP CONSTRAINT "satellite_observations_scene_id_observation_date_key";

ALTER TABLE "satellite_observations"
  ADD CONSTRAINT "satellite_obs_project_scene_date_key"
  UNIQUE ("project_id", "scene_id", "observation_date");
