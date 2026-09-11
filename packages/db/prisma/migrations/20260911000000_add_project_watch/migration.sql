-- Citizen watchlist: a citizen "following" a project.

CREATE TABLE "project_watches" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_checked_at" TIMESTAMPTZ(6),
  CONSTRAINT "project_watches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "project_watches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "project_watches_user_id_project_id_key" ON "project_watches" ("user_id", "project_id");
CREATE INDEX "project_watches_user_id_idx" ON "project_watches" ("user_id");
CREATE INDEX "project_watches_project_id_idx" ON "project_watches" ("project_id");
