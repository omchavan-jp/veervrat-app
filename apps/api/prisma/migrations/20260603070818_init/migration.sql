-- CreateEnum
CREATE TYPE "role" AS ENUM ('vratarthi', 'vratmitra', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "language" AS ENUM ('en', 'mr');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('email', 'google');

-- CreateEnum
CREATE TYPE "verification_type" AS ENUM ('email_verification', 'password_reset', 'email_change');

-- CreateEnum
CREATE TYPE "journey_state" AS ENUM ('not_started', 'active', 'paused', 'dormant', 'completed');

-- CreateEnum
CREATE TYPE "erc_status" AS ENUM ('not_started', 'in_progress', 'submitted', 'approved', 'revisit');

-- CreateEnum
CREATE TYPE "exposure_tier" AS ENUM ('local', 'national', 'international');

-- CreateEnum
CREATE TYPE "invitation_type" AS ENUM ('platform', 'vm_global', 'vm_journey');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "invitation_channel" AS ENUM ('in_app', 'email', 'external');

-- CreateEnum
CREATE TYPE "vm_relationship_state" AS ENUM ('pending', 'active');

-- CreateEnum
CREATE TYPE "checkin_status" AS ENUM ('done', 'partial', 'missed');

-- CreateEnum
CREATE TYPE "experience_visibility" AS ENUM ('only_me', 'friends', 'public');

-- CreateEnum
CREATE TYPE "erc_entity_type" AS ENUM ('exposure', 'resolution', 'challenge');

-- CreateEnum
CREATE TYPE "resource_type" AS ENUM ('file', 'link');

-- CreateEnum
CREATE TYPE "tag_entity_type" AS ENUM ('virtue', 'subvirtue', 'weakness', 'sentence', 'exposure', 'resolution', 'challenge', 'journey');

-- CreateEnum
CREATE TYPE "notification_event_type" AS ENUM ('vm_invitation_received', 'vm_invitation_accepted', 'vm_invitation_declined', 'vm_invitation_expired', 'invitee_joined_platform', 'journey_dormant', 'new_erc_available', 'erc_closure_submitted', 'erc_closure_approved', 'erc_returned_for_revisit', 'journey_completion_submitted', 'journey_completion_approved', 'custom_erc_review_requested', 'custom_erc_approved', 'custom_erc_rejected', 'vm_suggestion_new', 'vm_suggestion_dismissed', 'blog_comment_new', 'comment_reported', 'new_follower', 'chat_message_received', 'vm_withdrew');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "gender" TEXT,
    "dob" DATE,
    "language" "language" NOT NULL DEFAULT 'en',
    "email_verified_at" TIMESTAMP(3),
    "onboarding_completed_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "show_last_active" BOOLEAN NOT NULL DEFAULT true,
    "show_online_indicator" BOOLEAN NOT NULL DEFAULT true,
    "profile_private" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" "role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "follower_id" UUID NOT NULL,
    "followee_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id","followee_id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" "verification_type" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "inviter_id" UUID NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "invitee_id" UUID,
    "type" "invitation_type" NOT NULL,
    "scope_id" UUID,
    "status" "invitation_status" NOT NULL DEFAULT 'pending',
    "channel" "invitation_channel" NOT NULL DEFAULT 'in_app',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtues" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_mr" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subvirtues" (
    "id" UUID NOT NULL,
    "virtue_id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_mr" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subvirtues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weaknesses" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_mr" TEXT,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weaknesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weakness_subvirtues" (
    "weakness_id" UUID NOT NULL,
    "subvirtue_id" UUID NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "weakness_subvirtues_pkey" PRIMARY KEY ("weakness_id","subvirtue_id")
);

-- CreateTable
CREATE TABLE "sentences" (
    "id" UUID NOT NULL,
    "subvirtue_id" UUID NOT NULL,
    "text_en" TEXT NOT NULL,
    "text_mr" TEXT,
    "source_file" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sentences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exposures" (
    "id" UUID NOT NULL,
    "sentence_id" UUID NOT NULL,
    "tier" "exposure_tier" NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exposures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exposure_weaknesses" (
    "exposure_id" UUID NOT NULL,
    "weakness_id" UUID NOT NULL,

    CONSTRAINT "exposure_weaknesses_pkey" PRIMARY KEY ("exposure_id","weakness_id")
);

-- CreateTable
CREATE TABLE "resolutions" (
    "id" UUID NOT NULL,
    "sentence_id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "duration_weeks" INTEGER,
    "frequency_per_week" INTEGER,
    "frequency_label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_weaknesses" (
    "resolution_id" UUID NOT NULL,
    "weakness_id" UUID NOT NULL,

    CONSTRAINT "resolution_weaknesses_pkey" PRIMARY KEY ("resolution_id","weakness_id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "sentence_id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "duration_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_weaknesses" (
    "challenge_id" UUID NOT NULL,
    "weakness_id" UUID NOT NULL,

    CONSTRAINT "challenge_weaknesses_pkey" PRIMARY KEY ("challenge_id","weakness_id")
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weakness_id" UUID NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_answers" (
    "id" UUID NOT NULL,
    "test_attempt_id" UUID NOT NULL,
    "sentence_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journeys" (
    "id" UUID NOT NULL,
    "vratarthi_id" UUID NOT NULL,
    "sentence_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "state" "journey_state" NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "dormant_since" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "threshold_exposures" INTEGER NOT NULL DEFAULT 1,
    "threshold_resolutions" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_weaknesses" (
    "journey_id" UUID NOT NULL,
    "weakness_id" UUID NOT NULL,
    "attached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_weaknesses_pkey" PRIMARY KEY ("journey_id","weakness_id")
);

-- CreateTable
CREATE TABLE "vm_relationships" (
    "id" UUID NOT NULL,
    "vratarthi_id" UUID NOT NULL,
    "vm_id" UUID NOT NULL,
    "state" "vm_relationship_state" NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vm_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_vm_assignments" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "vm_id" UUID NOT NULL,
    "state" "vm_relationship_state" NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_vm_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_exposures" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "pool_exposure_id" UUID,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
    "status" "erc_status" NOT NULL DEFAULT 'not_started',
    "tier" "exposure_tier" NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "review_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_exposures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_resolutions" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "pool_resolution_id" UUID,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
    "status" "erc_status" NOT NULL DEFAULT 'not_started',
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "duration_weeks" INTEGER,
    "frequency_per_week" INTEGER,
    "frequency_label" TEXT,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "review_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_checkins" (
    "id" UUID NOT NULL,
    "journey_resolution_id" UUID NOT NULL,
    "status" "checkin_status" NOT NULL,
    "note" TEXT,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_challenges" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "pool_challenge_id" UUID,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
    "status" "erc_status" NOT NULL DEFAULT 'not_started',
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "duration_days" INTEGER,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "review_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vm_sidenotes" (
    "id" UUID NOT NULL,
    "vm_id" UUID NOT NULL,
    "entity_type" "erc_entity_type" NOT NULL,
    "journey_exposure_id" UUID,
    "journey_resolution_id" UUID,
    "journey_challenge_id" UUID,
    "text" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vm_sidenotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_logs" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "journey_id" UUID,
    "body" JSONB NOT NULL,
    "visibility" "experience_visibility" NOT NULL DEFAULT 'only_me',
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_log_tags" (
    "id" UUID NOT NULL,
    "experience_log_id" UUID NOT NULL,
    "entity_type" "tag_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,

    CONSTRAINT "experience_log_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "journey_id" UUID,
    "room_id" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "seq_no" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" UUID NOT NULL,
    "blog_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shlokas" (
    "id" UUID NOT NULL,
    "devanagari_text" TEXT NOT NULL,
    "transliteration" TEXT,
    "meaning_en" TEXT,
    "meaning_mr" TEXT,
    "source_citation" TEXT,
    "loose_tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shlokas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shloka_tags" (
    "id" UUID NOT NULL,
    "shloka_id" UUID NOT NULL,
    "entity_type" "tag_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,

    CONSTRAINT "shloka_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pothi_sections" (
    "id" UUID NOT NULL,
    "section_number" INTEGER NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_mr" TEXT,
    "intro_text" TEXT,
    "congregation_response" TEXT,
    "post_shloka_commentary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pothi_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pothi_section_shlokas" (
    "pothi_section_id" UUID NOT NULL,
    "shloka_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pothi_section_shlokas_pkey" PRIMARY KEY ("pothi_section_id","shloka_id")
);

-- CreateTable
CREATE TABLE "shloka_schedules" (
    "id" UUID NOT NULL,
    "shloka_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shloka_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shloka_queue_items" (
    "id" UUID NOT NULL,
    "shloka_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shloka_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "type" "resource_type" NOT NULL,
    "url" TEXT,
    "file_path" TEXT,
    "thumbnail_url" TEXT,
    "title" TEXT NOT NULL,
    "one_liner" TEXT,
    "description" JSONB,
    "loose_tags" TEXT[],
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_tags" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "entity_type" "tag_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,

    CONSTRAINT "resource_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "actor_id" UUID,
    "event_type" "notification_event_type" NOT NULL,
    "resource_type" TEXT,
    "resource_id" UUID,
    "read_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" UUID,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_provider_provider_account_id_key" ON "auth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_type_idx" ON "verification_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "invitations_inviter_id_idx" ON "invitations"("inviter_id");

-- CreateIndex
CREATE INDEX "invitations_invitee_email_idx" ON "invitations"("invitee_email");

-- CreateIndex
CREATE UNIQUE INDEX "virtues_name_en_key" ON "virtues"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "subvirtues_name_en_key" ON "subvirtues"("name_en");

-- CreateIndex
CREATE INDEX "subvirtues_virtue_id_idx" ON "subvirtues"("virtue_id");

-- CreateIndex
CREATE UNIQUE INDEX "weaknesses_name_en_key" ON "weaknesses"("name_en");

-- CreateIndex
CREATE INDEX "sentences_subvirtue_id_idx" ON "sentences"("subvirtue_id");

-- CreateIndex
CREATE INDEX "exposures_sentence_id_idx" ON "exposures"("sentence_id");

-- CreateIndex
CREATE INDEX "resolutions_sentence_id_idx" ON "resolutions"("sentence_id");

-- CreateIndex
CREATE INDEX "challenges_sentence_id_idx" ON "challenges"("sentence_id");

-- CreateIndex
CREATE INDEX "test_attempts_user_id_weakness_id_idx" ON "test_attempts"("user_id", "weakness_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_answers_test_attempt_id_sentence_id_key" ON "test_answers"("test_attempt_id", "sentence_id");

-- CreateIndex
CREATE INDEX "journeys_vratarthi_id_idx" ON "journeys"("vratarthi_id");

-- CreateIndex
CREATE INDEX "journeys_sentence_id_idx" ON "journeys"("sentence_id");

-- CreateIndex
CREATE INDEX "vm_relationships_vratarthi_id_idx" ON "vm_relationships"("vratarthi_id");

-- CreateIndex
CREATE INDEX "vm_relationships_vm_id_idx" ON "vm_relationships"("vm_id");

-- CreateIndex
CREATE INDEX "journey_vm_assignments_journey_id_idx" ON "journey_vm_assignments"("journey_id");

-- CreateIndex
CREATE INDEX "journey_vm_assignments_vm_id_idx" ON "journey_vm_assignments"("vm_id");

-- CreateIndex
CREATE INDEX "journey_exposures_journey_id_idx" ON "journey_exposures"("journey_id");

-- CreateIndex
CREATE INDEX "journey_resolutions_journey_id_idx" ON "journey_resolutions"("journey_id");

-- CreateIndex
CREATE INDEX "resolution_checkins_journey_resolution_id_idx" ON "resolution_checkins"("journey_resolution_id");

-- CreateIndex
CREATE INDEX "journey_challenges_journey_id_idx" ON "journey_challenges"("journey_id");

-- CreateIndex
CREATE UNIQUE INDEX "vm_sidenotes_journey_exposure_id_key" ON "vm_sidenotes"("journey_exposure_id");

-- CreateIndex
CREATE UNIQUE INDEX "vm_sidenotes_journey_resolution_id_key" ON "vm_sidenotes"("journey_resolution_id");

-- CreateIndex
CREATE UNIQUE INDEX "vm_sidenotes_journey_challenge_id_key" ON "vm_sidenotes"("journey_challenge_id");

-- CreateIndex
CREATE INDEX "experience_logs_author_id_idx" ON "experience_logs"("author_id");

-- CreateIndex
CREATE INDEX "experience_log_tags_experience_log_id_idx" ON "experience_log_tags"("experience_log_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_seq_no_idx" ON "chat_messages"("room_id", "seq_no");

-- CreateIndex
CREATE INDEX "blogs_author_id_idx" ON "blogs"("author_id");

-- CreateIndex
CREATE INDEX "blog_comments_blog_id_idx" ON "blog_comments"("blog_id");

-- CreateIndex
CREATE INDEX "shloka_tags_shloka_id_idx" ON "shloka_tags"("shloka_id");

-- CreateIndex
CREATE UNIQUE INDEX "pothi_sections_section_number_key" ON "pothi_sections"("section_number");

-- CreateIndex
CREATE UNIQUE INDEX "shloka_schedules_scheduled_date_key" ON "shloka_schedules"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "shloka_queue_items_position_key" ON "shloka_queue_items"("position");

-- CreateIndex
CREATE INDEX "resource_tags_resource_id_idx" ON "resource_tags"("resource_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications"("recipient_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_idx" ON "audit_events"("actor_id");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subvirtues" ADD CONSTRAINT "subvirtues_virtue_id_fkey" FOREIGN KEY ("virtue_id") REFERENCES "virtues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weakness_subvirtues" ADD CONSTRAINT "weakness_subvirtues_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weakness_subvirtues" ADD CONSTRAINT "weakness_subvirtues_subvirtue_id_fkey" FOREIGN KEY ("subvirtue_id") REFERENCES "subvirtues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_subvirtue_id_fkey" FOREIGN KEY ("subvirtue_id") REFERENCES "subvirtues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exposures" ADD CONSTRAINT "exposures_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "sentences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exposure_weaknesses" ADD CONSTRAINT "exposure_weaknesses_exposure_id_fkey" FOREIGN KEY ("exposure_id") REFERENCES "exposures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exposure_weaknesses" ADD CONSTRAINT "exposure_weaknesses_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "sentences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_weaknesses" ADD CONSTRAINT "resolution_weaknesses_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_weaknesses" ADD CONSTRAINT "resolution_weaknesses_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "sentences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_weaknesses" ADD CONSTRAINT "challenge_weaknesses_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_weaknesses" ADD CONSTRAINT "challenge_weaknesses_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_test_attempt_id_fkey" FOREIGN KEY ("test_attempt_id") REFERENCES "test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_vratarthi_id_fkey" FOREIGN KEY ("vratarthi_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "sentences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_weaknesses" ADD CONSTRAINT "journey_weaknesses_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_weaknesses" ADD CONSTRAINT "journey_weaknesses_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_relationships" ADD CONSTRAINT "vm_relationships_vm_id_fkey" FOREIGN KEY ("vm_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_vm_assignments" ADD CONSTRAINT "journey_vm_assignments_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_vm_assignments" ADD CONSTRAINT "journey_vm_assignments_vm_id_fkey" FOREIGN KEY ("vm_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_exposures" ADD CONSTRAINT "journey_exposures_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_exposures" ADD CONSTRAINT "journey_exposures_pool_exposure_id_fkey" FOREIGN KEY ("pool_exposure_id") REFERENCES "exposures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_resolutions" ADD CONSTRAINT "journey_resolutions_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_resolutions" ADD CONSTRAINT "journey_resolutions_pool_resolution_id_fkey" FOREIGN KEY ("pool_resolution_id") REFERENCES "resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_checkins" ADD CONSTRAINT "resolution_checkins_journey_resolution_id_fkey" FOREIGN KEY ("journey_resolution_id") REFERENCES "journey_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_challenges" ADD CONSTRAINT "journey_challenges_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_challenges" ADD CONSTRAINT "journey_challenges_pool_challenge_id_fkey" FOREIGN KEY ("pool_challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_sidenotes" ADD CONSTRAINT "vm_sidenotes_journey_exposure_id_fkey" FOREIGN KEY ("journey_exposure_id") REFERENCES "journey_exposures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_sidenotes" ADD CONSTRAINT "vm_sidenotes_journey_resolution_id_fkey" FOREIGN KEY ("journey_resolution_id") REFERENCES "journey_resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vm_sidenotes" ADD CONSTRAINT "vm_sidenotes_journey_challenge_id_fkey" FOREIGN KEY ("journey_challenge_id") REFERENCES "journey_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_logs" ADD CONSTRAINT "experience_logs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_logs" ADD CONSTRAINT "experience_logs_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_log_tags" ADD CONSTRAINT "experience_log_tags_experience_log_id_fkey" FOREIGN KEY ("experience_log_id") REFERENCES "experience_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shloka_tags" ADD CONSTRAINT "shloka_tags_shloka_id_fkey" FOREIGN KEY ("shloka_id") REFERENCES "shlokas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pothi_section_shlokas" ADD CONSTRAINT "pothi_section_shlokas_pothi_section_id_fkey" FOREIGN KEY ("pothi_section_id") REFERENCES "pothi_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pothi_section_shlokas" ADD CONSTRAINT "pothi_section_shlokas_shloka_id_fkey" FOREIGN KEY ("shloka_id") REFERENCES "shlokas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shloka_schedules" ADD CONSTRAINT "shloka_schedules_shloka_id_fkey" FOREIGN KEY ("shloka_id") REFERENCES "shlokas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shloka_queue_items" ADD CONSTRAINT "shloka_queue_items_shloka_id_fkey" FOREIGN KEY ("shloka_id") REFERENCES "shlokas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tags" ADD CONSTRAINT "resource_tags_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
