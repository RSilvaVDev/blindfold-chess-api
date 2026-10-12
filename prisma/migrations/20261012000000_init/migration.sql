-- CreateEnum
CREATE TYPE "verbosity" AS ENUM ('brief', 'standard', 'full');

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "voice_id" TEXT,
    "verbosity" "verbosity" NOT NULL DEFAULT 'standard',
    "confirm_moves" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "audio_cache" (
    "hash" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "chars" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_cache_pkey" PRIMARY KEY ("hash")
);

-- Supabase exposes public tables through its REST API using the public anon key.
-- RLS with no policies blocks that path; the API connects as the table owner,
-- which RLS does not restrict.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_cache" ENABLE ROW LEVEL SECURITY;
