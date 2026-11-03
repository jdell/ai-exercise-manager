-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('MIGRATION', 'DEBUGGING', 'ARCHITECTURE', 'CODE_REVIEW', 'SYSTEM_PROMPT', 'LIVE_CODING', 'GREENFIELD', 'DATA_ANALYSIS', 'DEVOPS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('INVITED', 'IN_PROGRESS', 'SUBMITTED', 'SCORED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "auth_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("user_id","tenant_id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "time_minutes" INTEGER NOT NULL,
    "source_files" JSONB NOT NULL DEFAULT '[]',
    "target_stack" TEXT,
    "scoring_dimensions" JSONB NOT NULL DEFAULT '[]',
    "allowed_tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rubric_notes" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "parent_template_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_sets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_set_items" (
    "exercise_set_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "exercise_set_items_pkey" PRIMARY KEY ("exercise_set_id","exercise_id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "exercise_set_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "prompt_history" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "scored_by_id" TEXT,
    "dimension" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "composite_score" DOUBLE PRECISION,
    "summary" TEXT,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_id_role_idx" ON "tenant_memberships"("tenant_id", "role");

-- CreateIndex
CREATE INDEX "exercises_tenant_id_type_idx" ON "exercises"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "exercise_sets_tenant_id_idx" ON "exercise_sets"("tenant_id");

-- CreateIndex
CREATE INDEX "exercise_set_items_exercise_set_id_position_idx" ON "exercise_set_items"("exercise_set_id", "position");

-- CreateIndex
CREATE INDEX "assessments_tenant_id_status_idx" ON "assessments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "assessments_candidate_id_idx" ON "assessments"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assessment_id_exercise_id_key" ON "submissions"("assessment_id", "exercise_id");

-- CreateIndex
CREATE INDEX "scores_submission_id_idx" ON "scores"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_assessment_id_key" ON "reports"("assessment_id");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_set_items" ADD CONSTRAINT "exercise_set_items_exercise_set_id_fkey" FOREIGN KEY ("exercise_set_id") REFERENCES "exercise_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_set_items" ADD CONSTRAINT "exercise_set_items_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_exercise_set_id_fkey" FOREIGN KEY ("exercise_set_id") REFERENCES "exercise_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_scored_by_id_fkey" FOREIGN KEY ("scored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
