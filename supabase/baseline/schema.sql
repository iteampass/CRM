-- Schema-only baseline exported from CRM after isolate_app_access.

-- For an EMPTY Supabase target only. Contains no users, API key values, or customer data.

BEGIN;

CREATE SCHEMA software;

CREATE SCHEMA realestate;

CREATE TYPE "software"."member_role" AS ENUM ('owner', 'admin', 'member', 'manager');

CREATE TYPE "software"."pipeline_stage" AS ENUM ('New', 'Researching', 'Qualified', 'Contacted', 'Meeting', 'Proposal', 'Negotiation', 'Won', 'Lost');

CREATE TYPE "software"."signal_type" AS ENUM ('hiring', 'funding', 'product_launch', 'leadership_change', 'tech_stack_change', 'news_mention', 'expansion', 'other');

CREATE TYPE "software"."signal_source" AS ENUM ('manual', 'imported', 'automated');

CREATE TYPE "software"."signal_strength" AS ENUM ('low', 'medium', 'high');

CREATE TYPE "software"."signal_status" AS ENUM ('new', 'reviewed', 'actioned', 'dismissed');

CREATE TABLE "software"."job_scan_settings" (
  "workspace_id" uuid NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "keywords" text[] DEFAULT ARRAY['Full Stack Developer'::text] NOT NULL,
  "sources" text[] DEFAULT ARRAY['remotive'::text, 'arbeitnow'::text, 'hackernews'::text, 'adzuna'::text] NOT NULL,
  "adzuna_country" text DEFAULT 'us'::text NOT NULL,
  "use_ai" boolean DEFAULT true NOT NULL,
  "last_run_at" timestamp with time zone,
  "locked_until" timestamp with time zone,
  "paused_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."job_scan_settings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."job_postings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "source" text NOT NULL,
  "external_id" text NOT NULL,
  "url" text,
  "title" text NOT NULL,
  "company_name" text,
  "location" text,
  "description" text,
  "posted_at" timestamp with time zone,
  "matched_keywords" text[] DEFAULT '{}'::text[] NOT NULL,
  "status" text DEFAULT 'new'::text NOT NULL,
  "extracted" jsonb,
  "error" text,
  "company_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."job_postings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."job_scan_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "trigger" text DEFAULT 'schedule'::text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "status" text DEFAULT 'running'::text NOT NULL,
  "fetched" integer DEFAULT 0 NOT NULL,
  "matched" integer DEFAULT 0 NOT NULL,
  "new_postings" integer DEFAULT 0 NOT NULL,
  "leads_created" integer DEFAULT 0 NOT NULL,
  "log" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "error" text
);

ALTER TABLE "software"."job_scan_runs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."leads" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "title" text DEFAULT 'Software development opportunity'::text NOT NULL,
  "stage" software.pipeline_stage DEFAULT 'New'::software.pipeline_stage NOT NULL,
  "lead_score" integer DEFAULT 0 NOT NULL,
  "owner_name" text,
  "source" text,
  "archived" boolean DEFAULT false NOT NULL,
  "last_activity_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."leads" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."lead_contacts" (
  "lead_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "role" text DEFAULT 'Influencer'::text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."lead_contacts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."sources" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "status" text DEFAULT 'not_configured'::text NOT NULL,
  "last_job_at" timestamp with time zone,
  "quota_used" integer DEFAULT 0 NOT NULL,
  "quota_limit" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."sources" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."listings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "city" text DEFAULT 'Belgrade'::text NOT NULL,
  "area" text NOT NULL,
  "price_eur" numeric(10,2) NOT NULL,
  "beds" integer DEFAULT 1 NOT NULL,
  "baths" integer DEFAULT 1 NOT NULL,
  "size_m2" numeric(8,2) NOT NULL,
  "furnished" boolean DEFAULT false NOT NULL,
  "image_url" text,
  "source" text NOT NULL,
  "source_url" text,
  "found_at" timestamp with time zone DEFAULT now() NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "risk" text DEFAULT 'low'::text NOT NULL,
  "duplicate_count" integer DEFAULT 0 NOT NULL,
  "map_x" numeric(5,2) DEFAULT 50 NOT NULL,
  "map_y" numeric(5,2) DEFAULT 50 NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."listings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."workspace_invitations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" software.member_role DEFAULT 'member'::software.member_role NOT NULL,
  "invited_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."workspace_invitations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."area_stats" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "area" text,
  "period" text NOT NULL,
  "avg_price" numeric(10,2) NOT NULL,
  "sample_size" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."area_stats" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."alerts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "saved_search_id" uuid,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."alerts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."favorites" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."favorites" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."saved_searches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "city" text,
  "areas" text[] DEFAULT '{}'::text[] NOT NULL,
  "min_price" numeric(10,2),
  "max_price" numeric(10,2),
  "property_type" text,
  "move_in_date" date,
  "alerts_enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."saved_searches" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "realestate"."profiles" (
  "user_id" uuid NOT NULL,
  "full_name" text DEFAULT ''::text NOT NULL,
  "preferred_city" text DEFAULT 'Belgrade'::text NOT NULL,
  "max_budget" numeric(10,2),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "realestate"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."api_keys" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying,
  "api_id" character varying,
  "key" text
);

ALTER TABLE "software"."api_keys" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."outreach" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid,
  "contact_id" uuid,
  "channel" text DEFAULT 'Email'::text NOT NULL,
  "subject" text,
  "message" text,
  "status" text DEFAULT 'Sent'::text NOT NULL,
  "reply" text,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "follow_up_date" date,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."outreach" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."site_content" (
  "id" text NOT NULL,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."site_content" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."signals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "type" software.signal_type NOT NULL,
  "description" text,
  "strength" software.signal_strength DEFAULT 'medium'::software.signal_strength NOT NULL,
  "source_url" text,
  "detected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lead_id" uuid,
  "title" text NOT NULL,
  "source" software.signal_source DEFAULT 'manual'::software.signal_source NOT NULL,
  "status" software.signal_status DEFAULT 'new'::software.signal_status NOT NULL,
  "created_by" uuid DEFAULT auth.uid()
);

ALTER TABLE "software"."signals" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid,
  "first_name" text NOT NULL,
  "last_name" text,
  "title" text,
  "email" text,
  "phone" text,
  "linkedin_url" text,
  "is_decision_maker" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'Not contacted'::text NOT NULL,
  "last_contacted_at" timestamp with time zone
);

ALTER TABLE "software"."contacts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."workspaces" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "plan" text DEFAULT 'starter'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."workspaces" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."workspace_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" software.member_role DEFAULT 'member'::software.member_role NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."workspace_members" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "domain" text,
  "industry" text,
  "employees" integer,
  "location" text,
  "funding" text,
  "technologies" text[] DEFAULT '{}'::text[] NOT NULL,
  "lead_type" text,
  "source" text,
  "stage" software.pipeline_stage DEFAULT 'New'::software.pipeline_stage NOT NULL,
  "owner_name" text,
  "lead_score" integer DEFAULT 0 NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "last_activity_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."companies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid,
  "contact_id" uuid,
  "type" text NOT NULL,
  "summary" text NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."activities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."tasks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid,
  "title" text NOT NULL,
  "due_date" date,
  "priority" text DEFAULT 'Medium'::text NOT NULL,
  "done" boolean DEFAULT false NOT NULL,
  "assignee_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."tasks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."notes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid,
  "body" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."notes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."tags" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "color" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."tags" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."company_tags" (
  "company_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL
);

ALTER TABLE "software"."company_tags" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."lead_sources" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "last_sync_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."lead_sources" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."saved_searches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "alert" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."saved_searches" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."outreach_sequences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "active" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "software"."outreach_sequences" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "software"."deals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "title" text NOT NULL,
  "stage" software.pipeline_stage DEFAULT 'New'::software.pipeline_stage NOT NULL,
  "value" numeric(12,2) DEFAULT 0 NOT NULL,
  "probability" integer DEFAULT 10 NOT NULL,
  "expected_close" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lead_id" uuid
);

ALTER TABLE "software"."deals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "software"."lead_sources" ADD CONSTRAINT "lead_sources_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."saved_searches" ADD CONSTRAINT "saved_searches_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."outreach_sequences" ADD CONSTRAINT "outreach_sequences_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."job_postings" ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."job_postings" ADD CONSTRAINT "job_postings_workspace_id_source_external_id_key" UNIQUE (workspace_id, source, external_id);

ALTER TABLE "software"."job_scan_runs" ADD CONSTRAINT "job_scan_runs_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."workspaces" ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."workspace_members" ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE (workspace_id, user_id);

ALTER TABLE "software"."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."contacts" ADD CONSTRAINT "contacts_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."signals" ADD CONSTRAINT "signals_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."deals" ADD CONSTRAINT "deals_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."activities" ADD CONSTRAINT "activities_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."notes" ADD CONSTRAINT "notes_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."tags" ADD CONSTRAINT "tags_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."tags" ADD CONSTRAINT "tags_workspace_id_name_key" UNIQUE (workspace_id, name);

ALTER TABLE "software"."company_tags" ADD CONSTRAINT "company_tags_pkey" PRIMARY KEY (company_id, tag_id);

ALTER TABLE "software"."job_scan_settings" ADD CONSTRAINT "job_scan_settings_pkey" PRIMARY KEY (workspace_id);

ALTER TABLE "software"."leads" ADD CONSTRAINT "leads_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."lead_contacts" ADD CONSTRAINT "lead_contacts_pkey" PRIMARY KEY (lead_id, contact_id);

ALTER TABLE "software"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."api_keys" ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."outreach" ADD CONSTRAINT "outreach_pkey" PRIMARY KEY (id);

ALTER TABLE "software"."site_content" ADD CONSTRAINT "site_content_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."listings" ADD CONSTRAINT "listings_risk_check" CHECK ((risk = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));

ALTER TABLE "realestate"."listings" ADD CONSTRAINT "listings_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."favorites" ADD CONSTRAINT "favorites_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."favorites" ADD CONSTRAINT "favorites_user_id_listing_id_key" UNIQUE (user_id, listing_id);

ALTER TABLE "realestate"."saved_searches" ADD CONSTRAINT "saved_searches_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."alerts" ADD CONSTRAINT "alerts_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."sources" ADD CONSTRAINT "sources_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."sources" ADD CONSTRAINT "sources_name_key" UNIQUE (name);

ALTER TABLE "realestate"."area_stats" ADD CONSTRAINT "area_stats_pkey" PRIMARY KEY (id);

ALTER TABLE "realestate"."area_stats" ADD CONSTRAINT "area_stats_area_period_key" UNIQUE (area, period);

ALTER TABLE "realestate"."profiles" ADD CONSTRAINT "profiles_full_name_check" CHECK ((length(full_name) <= 120));

ALTER TABLE "realestate"."profiles" ADD CONSTRAINT "profiles_preferred_city_check" CHECK ((length(preferred_city) <= 120));

ALTER TABLE "realestate"."profiles" ADD CONSTRAINT "profiles_max_budget_check" CHECK ((max_budget >= (0)::numeric));

ALTER TABLE "realestate"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (user_id);

ALTER TABLE "software"."company_tags" ADD CONSTRAINT "company_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES software.tags(id) ON DELETE CASCADE;

ALTER TABLE "software"."company_tags" ADD CONSTRAINT "company_tags_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."lead_sources" ADD CONSTRAINT "lead_sources_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."saved_searches" ADD CONSTRAINT "saved_searches_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."outreach_sequences" ADD CONSTRAINT "outreach_sequences_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."job_scan_settings" ADD CONSTRAINT "job_scan_settings_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."job_postings" ADD CONSTRAINT "job_postings_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."job_postings" ADD CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE SET NULL;

ALTER TABLE "software"."job_scan_runs" ADD CONSTRAINT "job_scan_runs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."companies" ADD CONSTRAINT "companies_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."contacts" ADD CONSTRAINT "contacts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."signals" ADD CONSTRAINT "signals_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."signals" ADD CONSTRAINT "signals_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."deals" ADD CONSTRAINT "deals_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."deals" ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."activities" ADD CONSTRAINT "activities_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."activities" ADD CONSTRAINT "activities_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."activities" ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES software.contacts(id) ON DELETE SET NULL;

ALTER TABLE "software"."tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."tasks" ADD CONSTRAINT "tasks_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."notes" ADD CONSTRAINT "notes_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."notes" ADD CONSTRAINT "notes_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."tags" ADD CONSTRAINT "tags_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."company_tags" ADD CONSTRAINT "company_tags_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."leads" ADD CONSTRAINT "leads_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."leads" ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE CASCADE;

ALTER TABLE "software"."lead_contacts" ADD CONSTRAINT "lead_contacts_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES software.leads(id) ON DELETE CASCADE;

ALTER TABLE "software"."lead_contacts" ADD CONSTRAINT "lead_contacts_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES software.contacts(id) ON DELETE CASCADE;

ALTER TABLE "software"."lead_contacts" ADD CONSTRAINT "lead_contacts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES software.leads(id) ON DELETE CASCADE;

ALTER TABLE "software"."signals" ADD CONSTRAINT "signals_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES software.leads(id) ON DELETE SET NULL;

ALTER TABLE "software"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES software.workspaces(id) ON DELETE CASCADE;

ALTER TABLE "software"."outreach" ADD CONSTRAINT "outreach_company_id_fkey" FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE SET NULL;

ALTER TABLE "software"."outreach" ADD CONSTRAINT "outreach_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES software.contacts(id) ON DELETE SET NULL;

ALTER TABLE "realestate"."favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "realestate"."favorites" ADD CONSTRAINT "favorites_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES realestate.listings(id) ON DELETE CASCADE;

ALTER TABLE "realestate"."saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "realestate"."alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "realestate"."alerts" ADD CONSTRAINT "alerts_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES realestate.listings(id) ON DELETE CASCADE;

ALTER TABLE "realestate"."alerts" ADD CONSTRAINT "alerts_saved_search_id_fkey" FOREIGN KEY (saved_search_id) REFERENCES realestate.saved_searches(id) ON DELETE SET NULL;

ALTER TABLE "realestate"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION software.list_members(_ws uuid)
 RETURNS TABLE(user_id uuid, email text, full_name text, avatar_path text, role software.member_role, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'software', 'public'
AS $function$
BEGIN
  IF NOT software.is_member(_ws) THEN RAISE EXCEPTION 'not a member'; END IF;
  RETURN QUERY
    SELECT m.user_id, u.email::text, (u.raw_user_meta_data->>'full_name')::text, (u.raw_user_meta_data->>'avatar_path')::text, m.role, m.created_at
    FROM software.workspace_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.workspace_id = _ws ORDER BY m.created_at;
END $function$
;

REVOKE ALL ON FUNCTION "software"."list_members"(_ws uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "software"."list_members"(_ws uuid) TO "authenticated";

CREATE OR REPLACE FUNCTION software.is_member(_ws uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'software'
AS $function$
  SELECT EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid())
$function$
;

REVOKE ALL ON FUNCTION "software"."is_member"(_ws uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "software"."is_member"(_ws uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "software"."is_member"(_ws uuid) TO "service_role";

CREATE OR REPLACE FUNCTION software.is_admin(_ws uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'software'
AS $function$
  SELECT EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid() AND role IN ('owner','admin'))
$function$
;

REVOKE ALL ON FUNCTION "software"."is_admin"(_ws uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "software"."is_admin"(_ws uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "software"."is_admin"(_ws uuid) TO "service_role";

CREATE OR REPLACE FUNCTION software.protect_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role::text = 'owner' THEN RAISE EXCEPTION 'The workspace owner cannot be changed or removed'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role::text = 'owner' THEN RAISE EXCEPTION 'Owner role cannot be assigned'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

REVOKE ALL ON FUNCTION "software"."protect_owner"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "software"."protect_owner"() TO PUBLIC;

CREATE OR REPLACE FUNCTION realestate.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

REVOKE ALL ON FUNCTION "realestate"."set_updated_at"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "realestate"."set_updated_at"() TO PUBLIC;

CREATE OR REPLACE FUNCTION software.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'software'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;

REVOKE ALL ON FUNCTION "software"."touch_updated_at"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "software"."touch_updated_at"() TO PUBLIC;

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  me uuid := auth.uid();
  ws uuid;
  em text;
  confirmed_at timestamptz;
  inv software.workspace_invitations%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  -- Serialize simultaneous first visits by the same user.
  SELECT email, email_confirmed_at INTO em, confirmed_at
    FROM auth.users WHERE id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members
    WHERE user_id = me ORDER BY created_at, workspace_id LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Verify your email before accepting a workspace invitation' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inv FROM software.workspace_invitations
    WHERE lower(email) = lower(em) AND role <> 'owner'::software.member_role
      AND created_at > now() - interval '7 days'
    ORDER BY created_at, id LIMIT 1 FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'You don''t have access to this workspace. Ask an administrator for an invitation.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO software.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, me, inv.role);
  DELETE FROM software.workspace_invitations WHERE id = inv.id;
  RETURN inv.workspace_id;
END;
$function$
;

REVOKE ALL ON FUNCTION "software"."join_demo_workspace"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "software"."join_demo_workspace"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "software"."join_demo_workspace"() TO "service_role";

CREATE INDEX companies_workspace_id_lead_score_idx ON software.companies USING btree (workspace_id, lead_score DESC);

CREATE INDEX job_postings_workspace_id_status_created_at_idx ON software.job_postings USING btree (workspace_id, status, created_at);

CREATE INDEX leads_company_id_idx ON software.leads USING btree (company_id);

CREATE INDEX deals_workspace_id_stage_idx ON software.deals USING btree (workspace_id, stage);

CREATE INDEX tasks_workspace_id_due_date_idx ON software.tasks USING btree (workspace_id, due_date);

CREATE INDEX signals_company_idx ON software.signals USING btree (company_id);

CREATE INDEX outreach_ws_idx ON software.outreach USING btree (workspace_id, sent_at DESC);

CREATE INDEX saved_searches_user_id_idx ON realestate.saved_searches USING btree (user_id);

CREATE INDEX signals_company_id_idx ON software.signals USING btree (company_id);

CREATE INDEX alerts_user_id_created_at_idx ON realestate.alerts USING btree (user_id, created_at DESC);

CREATE INDEX signals_type_idx ON software.signals USING btree (type);

CREATE INDEX contacts_company_id_idx ON software.contacts USING btree (company_id);

CREATE INDEX signals_detected_idx ON software.signals USING btree (detected_at DESC);

CREATE UNIQUE INDEX workspace_invitations_ws_email ON software.workspace_invitations USING btree (workspace_id, lower(email));

CREATE INDEX leads_workspace_id_idx ON software.leads USING btree (workspace_id);

CREATE INDEX lead_contacts_contact_id_idx ON software.lead_contacts USING btree (contact_id);

CREATE INDEX job_scan_runs_workspace_id_started_at_idx ON software.job_scan_runs USING btree (workspace_id, started_at DESC);

CREATE INDEX activities_company_id_occurred_at_idx ON software.activities USING btree (company_id, occurred_at DESC);

CREATE INDEX signals_lead_idx ON software.signals USING btree (lead_id);

CREATE TRIGGER touch BEFORE UPDATE ON software.workspaces FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.companies FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.contacts FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.signals FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.deals FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.activities FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.tasks FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.notes FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.tags FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.lead_sources FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.saved_searches FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.outreach_sequences FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.job_scan_settings FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER touch BEFORE UPDATE ON software.job_postings FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER leads_touch BEFORE UPDATE ON software.leads FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER workspace_members_protect_owner BEFORE INSERT OR DELETE OR UPDATE ON software.workspace_members FOR EACH ROW EXECUTE FUNCTION software.protect_owner();

CREATE TRIGGER site_content_touch BEFORE UPDATE ON software.site_content FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

CREATE TRIGGER set_listings_updated_at BEFORE UPDATE ON realestate.listings FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

CREATE TRIGGER set_saved_searches_updated_at BEFORE UPDATE ON realestate.saved_searches FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

CREATE TRIGGER set_sources_updated_at BEFORE UPDATE ON realestate.sources FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

CREATE TRIGGER set_area_stats_updated_at BEFORE UPDATE ON realestate.area_stats FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON realestate.profiles FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

CREATE POLICY "ws_select" ON "software"."workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING (software.is_member(id));

CREATE POLICY "ws_update" ON "software"."workspaces" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (software.is_admin(id));

CREATE POLICY "wm_select" ON "software"."workspace_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (software.is_member(workspace_id));

CREATE POLICY "wm_admin" ON "software"."workspace_members" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_admin(workspace_id)) WITH CHECK (software.is_admin(workspace_id));

CREATE POLICY "member_all" ON "software"."companies" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."contacts" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."signals" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."deals" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."activities" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."tasks" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."notes" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."company_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."lead_sources" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."saved_searches" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."outreach_sequences" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "settings_select" ON "software"."job_scan_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (software.is_member(workspace_id));

CREATE POLICY "settings_admin" ON "software"."job_scan_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_admin(workspace_id)) WITH CHECK (software.is_admin(workspace_id));

CREATE POLICY "postings_select" ON "software"."job_postings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (software.is_member(workspace_id));

CREATE POLICY "runs_select" ON "software"."job_scan_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."leads" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "member_all" ON "software"."lead_contacts" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "Signed-in users can view avatars" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((bucket_id = 'avatars'::text));

CREATE POLICY "TeamPass admins update site content" ON "software"."site_content" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (software.is_admin('00000000-0000-0000-0000-000000000001'::uuid)) WITH CHECK (software.is_admin('00000000-0000-0000-0000-000000000001'::uuid));

CREATE POLICY "Users upload own avatar" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users update own avatar" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users delete own avatar" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "inv_select" ON "software"."workspace_invitations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (software.is_member(workspace_id));

CREATE POLICY "inv_admin" ON "software"."workspace_invitations" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_admin(workspace_id)) WITH CHECK ((software.is_admin(workspace_id) AND ((role)::text <> 'owner'::text)));

CREATE POLICY "member_all" ON "software"."outreach" AS PERMISSIVE FOR ALL TO "authenticated" USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));

CREATE POLICY "Anyone can read site content" ON "software"."site_content" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);

CREATE POLICY "TeamPass admins insert site content" ON "software"."site_content" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (software.is_admin('00000000-0000-0000-0000-000000000001'::uuid));

CREATE POLICY "Website admins manage slide images" ON "storage"."objects" AS PERMISSIVE FOR ALL TO "authenticated" USING (((bucket_id = 'website-slides'::text) AND software.is_admin('00000000-0000-0000-0000-000000000001'::uuid))) WITH CHECK (((bucket_id = 'website-slides'::text) AND ((storage.foldername(name))[1] = 'landing'::text) AND (lower(storage.extension(name)) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text, 'webp'::text, 'avif'::text])) AND software.is_admin('00000000-0000-0000-0000-000000000001'::uuid)));

CREATE POLICY "Visitors read published slide images" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (((bucket_id = 'website-slides'::text) AND (EXISTS ( SELECT 1
   FROM (software.site_content s
     CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN (jsonb_typeof((s.content -> 'heroSlides'::text)) = 'array'::text) THEN (s.content -> 'heroSlides'::text)
            ELSE '[]'::jsonb
        END) slide(value))
  WHERE ((s.id = 'landing'::text) AND ((slide.value ->> 'path'::text) = objects.name))))));

CREATE POLICY "Signed-in users can view listings" ON "realestate"."listings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Users view own favorites" ON "realestate"."favorites" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users insert own favorites" ON "realestate"."favorites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users delete own favorites" ON "realestate"."favorites" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users update own favorites" ON "realestate"."favorites" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users view own saved searches" ON "realestate"."saved_searches" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users insert own saved searches" ON "realestate"."saved_searches" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users update own saved searches" ON "realestate"."saved_searches" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users delete own saved searches" ON "realestate"."saved_searches" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users view own alerts" ON "realestate"."alerts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users update own alerts" ON "realestate"."alerts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users delete own alerts" ON "realestate"."alerts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Signed-in users can view sources" ON "realestate"."sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Signed-in users can view area stats" ON "realestate"."area_stats" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Anyone can read listings" ON "realestate"."listings" AS PERMISSIVE FOR SELECT TO "anon" USING (true);

CREATE POLICY "Anyone can read sources" ON "realestate"."sources" AS PERMISSIVE FOR SELECT TO "anon" USING (true);

CREATE POLICY "Anyone can read area stats" ON "realestate"."area_stats" AS PERMISSIVE FOR SELECT TO "anon" USING (true);

CREATE POLICY "Users manage own profile" ON "realestate"."profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

GRANT INSERT ON TABLE "software"."job_scan_settings" TO "authenticated";

GRANT SELECT ON TABLE "software"."job_scan_settings" TO "authenticated";

GRANT UPDATE ON TABLE "software"."job_scan_settings" TO "authenticated";

GRANT DELETE ON TABLE "software"."job_scan_settings" TO "authenticated";

GRANT INSERT ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT SELECT ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT UPDATE ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT DELETE ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT REFERENCES ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT TRIGGER ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."job_scan_settings" TO "service_role";

GRANT INSERT ON TABLE "software"."job_postings" TO "authenticated";

GRANT SELECT ON TABLE "software"."job_postings" TO "authenticated";

GRANT UPDATE ON TABLE "software"."job_postings" TO "authenticated";

GRANT DELETE ON TABLE "software"."job_postings" TO "authenticated";

GRANT INSERT ON TABLE "software"."job_postings" TO "service_role";

GRANT SELECT ON TABLE "software"."job_postings" TO "service_role";

GRANT UPDATE ON TABLE "software"."job_postings" TO "service_role";

GRANT DELETE ON TABLE "software"."job_postings" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."job_postings" TO "service_role";

GRANT REFERENCES ON TABLE "software"."job_postings" TO "service_role";

GRANT TRIGGER ON TABLE "software"."job_postings" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."job_postings" TO "service_role";

GRANT INSERT ON TABLE "software"."job_scan_runs" TO "authenticated";

GRANT SELECT ON TABLE "software"."job_scan_runs" TO "authenticated";

GRANT UPDATE ON TABLE "software"."job_scan_runs" TO "authenticated";

GRANT DELETE ON TABLE "software"."job_scan_runs" TO "authenticated";

GRANT INSERT ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT SELECT ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT UPDATE ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT DELETE ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT REFERENCES ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT TRIGGER ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."job_scan_runs" TO "service_role";

GRANT INSERT ON TABLE "software"."leads" TO "authenticated";

GRANT SELECT ON TABLE "software"."leads" TO "authenticated";

GRANT UPDATE ON TABLE "software"."leads" TO "authenticated";

GRANT DELETE ON TABLE "software"."leads" TO "authenticated";

GRANT INSERT ON TABLE "software"."leads" TO "service_role";

GRANT SELECT ON TABLE "software"."leads" TO "service_role";

GRANT UPDATE ON TABLE "software"."leads" TO "service_role";

GRANT DELETE ON TABLE "software"."leads" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."leads" TO "service_role";

GRANT REFERENCES ON TABLE "software"."leads" TO "service_role";

GRANT TRIGGER ON TABLE "software"."leads" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."leads" TO "service_role";

GRANT INSERT ON TABLE "software"."lead_contacts" TO "authenticated";

GRANT SELECT ON TABLE "software"."lead_contacts" TO "authenticated";

GRANT UPDATE ON TABLE "software"."lead_contacts" TO "authenticated";

GRANT DELETE ON TABLE "software"."lead_contacts" TO "authenticated";

GRANT INSERT ON TABLE "software"."lead_contacts" TO "service_role";

GRANT SELECT ON TABLE "software"."lead_contacts" TO "service_role";

GRANT UPDATE ON TABLE "software"."lead_contacts" TO "service_role";

GRANT DELETE ON TABLE "software"."lead_contacts" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."lead_contacts" TO "service_role";

GRANT REFERENCES ON TABLE "software"."lead_contacts" TO "service_role";

GRANT TRIGGER ON TABLE "software"."lead_contacts" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."lead_contacts" TO "service_role";

GRANT SELECT ON TABLE "realestate"."sources" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."sources" TO "service_role";

GRANT SELECT ON TABLE "realestate"."sources" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."sources" TO "service_role";

GRANT DELETE ON TABLE "realestate"."sources" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."sources" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."sources" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."sources" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."sources" TO "service_role";

GRANT SELECT ON TABLE "realestate"."sources" TO "anon";

GRANT SELECT ON TABLE "realestate"."listings" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."listings" TO "service_role";

GRANT SELECT ON TABLE "realestate"."listings" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."listings" TO "service_role";

GRANT DELETE ON TABLE "realestate"."listings" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."listings" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."listings" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."listings" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."listings" TO "service_role";

GRANT SELECT ON TABLE "realestate"."listings" TO "anon";

GRANT INSERT ON TABLE "software"."workspace_invitations" TO "authenticated";

GRANT SELECT ON TABLE "software"."workspace_invitations" TO "authenticated";

GRANT UPDATE ON TABLE "software"."workspace_invitations" TO "authenticated";

GRANT DELETE ON TABLE "software"."workspace_invitations" TO "authenticated";

GRANT INSERT ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT SELECT ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT UPDATE ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT DELETE ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT REFERENCES ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT TRIGGER ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."workspace_invitations" TO "service_role";

GRANT SELECT ON TABLE "realestate"."area_stats" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."area_stats" TO "service_role";

GRANT SELECT ON TABLE "realestate"."area_stats" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."area_stats" TO "service_role";

GRANT DELETE ON TABLE "realestate"."area_stats" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."area_stats" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."area_stats" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."area_stats" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."area_stats" TO "service_role";

GRANT SELECT ON TABLE "realestate"."area_stats" TO "anon";

GRANT SELECT ON TABLE "realestate"."alerts" TO "authenticated";

GRANT DELETE ON TABLE "realestate"."alerts" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."alerts" TO "service_role";

GRANT SELECT ON TABLE "realestate"."alerts" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."alerts" TO "service_role";

GRANT DELETE ON TABLE "realestate"."alerts" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."alerts" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."alerts" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."alerts" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."alerts" TO "service_role";

GRANT INSERT ON TABLE "realestate"."favorites" TO "authenticated";

GRANT SELECT ON TABLE "realestate"."favorites" TO "authenticated";

GRANT UPDATE ON TABLE "realestate"."favorites" TO "authenticated";

GRANT DELETE ON TABLE "realestate"."favorites" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."favorites" TO "service_role";

GRANT SELECT ON TABLE "realestate"."favorites" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."favorites" TO "service_role";

GRANT DELETE ON TABLE "realestate"."favorites" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."favorites" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."favorites" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."favorites" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."favorites" TO "service_role";

GRANT INSERT ON TABLE "realestate"."saved_searches" TO "authenticated";

GRANT SELECT ON TABLE "realestate"."saved_searches" TO "authenticated";

GRANT UPDATE ON TABLE "realestate"."saved_searches" TO "authenticated";

GRANT DELETE ON TABLE "realestate"."saved_searches" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT SELECT ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT DELETE ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."saved_searches" TO "service_role";

GRANT INSERT ON TABLE "realestate"."profiles" TO "authenticated";

GRANT SELECT ON TABLE "realestate"."profiles" TO "authenticated";

GRANT UPDATE ON TABLE "realestate"."profiles" TO "authenticated";

GRANT DELETE ON TABLE "realestate"."profiles" TO "authenticated";

GRANT INSERT ON TABLE "realestate"."profiles" TO "service_role";

GRANT SELECT ON TABLE "realestate"."profiles" TO "service_role";

GRANT UPDATE ON TABLE "realestate"."profiles" TO "service_role";

GRANT DELETE ON TABLE "realestate"."profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "realestate"."profiles" TO "service_role";

GRANT REFERENCES ON TABLE "realestate"."profiles" TO "service_role";

GRANT TRIGGER ON TABLE "realestate"."profiles" TO "service_role";

GRANT MAINTAIN ON TABLE "realestate"."profiles" TO "service_role";

GRANT SELECT ON TABLE "software"."api_keys" TO "service_role";

GRANT INSERT ON TABLE "software"."outreach" TO "authenticated";

GRANT SELECT ON TABLE "software"."outreach" TO "authenticated";

GRANT UPDATE ON TABLE "software"."outreach" TO "authenticated";

GRANT DELETE ON TABLE "software"."outreach" TO "authenticated";

GRANT INSERT ON TABLE "software"."outreach" TO "service_role";

GRANT SELECT ON TABLE "software"."outreach" TO "service_role";

GRANT UPDATE ON TABLE "software"."outreach" TO "service_role";

GRANT DELETE ON TABLE "software"."outreach" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."outreach" TO "service_role";

GRANT REFERENCES ON TABLE "software"."outreach" TO "service_role";

GRANT TRIGGER ON TABLE "software"."outreach" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."outreach" TO "service_role";

GRANT SELECT ON TABLE "software"."site_content" TO "anon";

GRANT INSERT ON TABLE "software"."site_content" TO "authenticated";

GRANT SELECT ON TABLE "software"."site_content" TO "authenticated";

GRANT UPDATE ON TABLE "software"."site_content" TO "authenticated";

GRANT INSERT ON TABLE "software"."site_content" TO "service_role";

GRANT SELECT ON TABLE "software"."site_content" TO "service_role";

GRANT UPDATE ON TABLE "software"."site_content" TO "service_role";

GRANT DELETE ON TABLE "software"."site_content" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."site_content" TO "service_role";

GRANT REFERENCES ON TABLE "software"."site_content" TO "service_role";

GRANT TRIGGER ON TABLE "software"."site_content" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."site_content" TO "service_role";

GRANT INSERT ON TABLE "software"."signals" TO "authenticated";

GRANT SELECT ON TABLE "software"."signals" TO "authenticated";

GRANT UPDATE ON TABLE "software"."signals" TO "authenticated";

GRANT DELETE ON TABLE "software"."signals" TO "authenticated";

GRANT INSERT ON TABLE "software"."signals" TO "service_role";

GRANT SELECT ON TABLE "software"."signals" TO "service_role";

GRANT UPDATE ON TABLE "software"."signals" TO "service_role";

GRANT DELETE ON TABLE "software"."signals" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."signals" TO "service_role";

GRANT REFERENCES ON TABLE "software"."signals" TO "service_role";

GRANT TRIGGER ON TABLE "software"."signals" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."signals" TO "service_role";

GRANT INSERT ON TABLE "software"."contacts" TO "authenticated";

GRANT SELECT ON TABLE "software"."contacts" TO "authenticated";

GRANT UPDATE ON TABLE "software"."contacts" TO "authenticated";

GRANT DELETE ON TABLE "software"."contacts" TO "authenticated";

GRANT INSERT ON TABLE "software"."contacts" TO "service_role";

GRANT SELECT ON TABLE "software"."contacts" TO "service_role";

GRANT UPDATE ON TABLE "software"."contacts" TO "service_role";

GRANT DELETE ON TABLE "software"."contacts" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."contacts" TO "service_role";

GRANT REFERENCES ON TABLE "software"."contacts" TO "service_role";

GRANT TRIGGER ON TABLE "software"."contacts" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."contacts" TO "service_role";

GRANT INSERT ON TABLE "software"."workspaces" TO "authenticated";

GRANT SELECT ON TABLE "software"."workspaces" TO "authenticated";

GRANT UPDATE ON TABLE "software"."workspaces" TO "authenticated";

GRANT DELETE ON TABLE "software"."workspaces" TO "authenticated";

GRANT INSERT ON TABLE "software"."workspaces" TO "service_role";

GRANT SELECT ON TABLE "software"."workspaces" TO "service_role";

GRANT UPDATE ON TABLE "software"."workspaces" TO "service_role";

GRANT DELETE ON TABLE "software"."workspaces" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."workspaces" TO "service_role";

GRANT REFERENCES ON TABLE "software"."workspaces" TO "service_role";

GRANT TRIGGER ON TABLE "software"."workspaces" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."workspaces" TO "service_role";

GRANT INSERT ON TABLE "software"."workspace_members" TO "authenticated";

GRANT SELECT ON TABLE "software"."workspace_members" TO "authenticated";

GRANT UPDATE ON TABLE "software"."workspace_members" TO "authenticated";

GRANT DELETE ON TABLE "software"."workspace_members" TO "authenticated";

GRANT INSERT ON TABLE "software"."workspace_members" TO "service_role";

GRANT SELECT ON TABLE "software"."workspace_members" TO "service_role";

GRANT UPDATE ON TABLE "software"."workspace_members" TO "service_role";

GRANT DELETE ON TABLE "software"."workspace_members" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."workspace_members" TO "service_role";

GRANT REFERENCES ON TABLE "software"."workspace_members" TO "service_role";

GRANT TRIGGER ON TABLE "software"."workspace_members" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."workspace_members" TO "service_role";

GRANT INSERT ON TABLE "software"."companies" TO "authenticated";

GRANT SELECT ON TABLE "software"."companies" TO "authenticated";

GRANT UPDATE ON TABLE "software"."companies" TO "authenticated";

GRANT DELETE ON TABLE "software"."companies" TO "authenticated";

GRANT INSERT ON TABLE "software"."companies" TO "service_role";

GRANT SELECT ON TABLE "software"."companies" TO "service_role";

GRANT UPDATE ON TABLE "software"."companies" TO "service_role";

GRANT DELETE ON TABLE "software"."companies" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."companies" TO "service_role";

GRANT REFERENCES ON TABLE "software"."companies" TO "service_role";

GRANT TRIGGER ON TABLE "software"."companies" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."companies" TO "service_role";

GRANT INSERT ON TABLE "software"."activities" TO "authenticated";

GRANT SELECT ON TABLE "software"."activities" TO "authenticated";

GRANT UPDATE ON TABLE "software"."activities" TO "authenticated";

GRANT DELETE ON TABLE "software"."activities" TO "authenticated";

GRANT INSERT ON TABLE "software"."activities" TO "service_role";

GRANT SELECT ON TABLE "software"."activities" TO "service_role";

GRANT UPDATE ON TABLE "software"."activities" TO "service_role";

GRANT DELETE ON TABLE "software"."activities" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."activities" TO "service_role";

GRANT REFERENCES ON TABLE "software"."activities" TO "service_role";

GRANT TRIGGER ON TABLE "software"."activities" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."activities" TO "service_role";

GRANT INSERT ON TABLE "software"."tasks" TO "authenticated";

GRANT SELECT ON TABLE "software"."tasks" TO "authenticated";

GRANT UPDATE ON TABLE "software"."tasks" TO "authenticated";

GRANT DELETE ON TABLE "software"."tasks" TO "authenticated";

GRANT INSERT ON TABLE "software"."tasks" TO "service_role";

GRANT SELECT ON TABLE "software"."tasks" TO "service_role";

GRANT UPDATE ON TABLE "software"."tasks" TO "service_role";

GRANT DELETE ON TABLE "software"."tasks" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."tasks" TO "service_role";

GRANT REFERENCES ON TABLE "software"."tasks" TO "service_role";

GRANT TRIGGER ON TABLE "software"."tasks" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."tasks" TO "service_role";

GRANT INSERT ON TABLE "software"."notes" TO "authenticated";

GRANT SELECT ON TABLE "software"."notes" TO "authenticated";

GRANT UPDATE ON TABLE "software"."notes" TO "authenticated";

GRANT DELETE ON TABLE "software"."notes" TO "authenticated";

GRANT INSERT ON TABLE "software"."notes" TO "service_role";

GRANT SELECT ON TABLE "software"."notes" TO "service_role";

GRANT UPDATE ON TABLE "software"."notes" TO "service_role";

GRANT DELETE ON TABLE "software"."notes" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."notes" TO "service_role";

GRANT REFERENCES ON TABLE "software"."notes" TO "service_role";

GRANT TRIGGER ON TABLE "software"."notes" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."notes" TO "service_role";

GRANT INSERT ON TABLE "software"."tags" TO "authenticated";

GRANT SELECT ON TABLE "software"."tags" TO "authenticated";

GRANT UPDATE ON TABLE "software"."tags" TO "authenticated";

GRANT DELETE ON TABLE "software"."tags" TO "authenticated";

GRANT INSERT ON TABLE "software"."tags" TO "service_role";

GRANT SELECT ON TABLE "software"."tags" TO "service_role";

GRANT UPDATE ON TABLE "software"."tags" TO "service_role";

GRANT DELETE ON TABLE "software"."tags" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."tags" TO "service_role";

GRANT REFERENCES ON TABLE "software"."tags" TO "service_role";

GRANT TRIGGER ON TABLE "software"."tags" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."tags" TO "service_role";

GRANT INSERT ON TABLE "software"."company_tags" TO "authenticated";

GRANT SELECT ON TABLE "software"."company_tags" TO "authenticated";

GRANT UPDATE ON TABLE "software"."company_tags" TO "authenticated";

GRANT DELETE ON TABLE "software"."company_tags" TO "authenticated";

GRANT INSERT ON TABLE "software"."company_tags" TO "service_role";

GRANT SELECT ON TABLE "software"."company_tags" TO "service_role";

GRANT UPDATE ON TABLE "software"."company_tags" TO "service_role";

GRANT DELETE ON TABLE "software"."company_tags" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."company_tags" TO "service_role";

GRANT REFERENCES ON TABLE "software"."company_tags" TO "service_role";

GRANT TRIGGER ON TABLE "software"."company_tags" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."company_tags" TO "service_role";

GRANT INSERT ON TABLE "software"."lead_sources" TO "authenticated";

GRANT SELECT ON TABLE "software"."lead_sources" TO "authenticated";

GRANT UPDATE ON TABLE "software"."lead_sources" TO "authenticated";

GRANT DELETE ON TABLE "software"."lead_sources" TO "authenticated";

GRANT INSERT ON TABLE "software"."lead_sources" TO "service_role";

GRANT SELECT ON TABLE "software"."lead_sources" TO "service_role";

GRANT UPDATE ON TABLE "software"."lead_sources" TO "service_role";

GRANT DELETE ON TABLE "software"."lead_sources" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."lead_sources" TO "service_role";

GRANT REFERENCES ON TABLE "software"."lead_sources" TO "service_role";

GRANT TRIGGER ON TABLE "software"."lead_sources" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."lead_sources" TO "service_role";

GRANT INSERT ON TABLE "software"."saved_searches" TO "authenticated";

GRANT SELECT ON TABLE "software"."saved_searches" TO "authenticated";

GRANT UPDATE ON TABLE "software"."saved_searches" TO "authenticated";

GRANT DELETE ON TABLE "software"."saved_searches" TO "authenticated";

GRANT INSERT ON TABLE "software"."saved_searches" TO "service_role";

GRANT SELECT ON TABLE "software"."saved_searches" TO "service_role";

GRANT UPDATE ON TABLE "software"."saved_searches" TO "service_role";

GRANT DELETE ON TABLE "software"."saved_searches" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."saved_searches" TO "service_role";

GRANT REFERENCES ON TABLE "software"."saved_searches" TO "service_role";

GRANT TRIGGER ON TABLE "software"."saved_searches" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."saved_searches" TO "service_role";

GRANT INSERT ON TABLE "software"."outreach_sequences" TO "authenticated";

GRANT SELECT ON TABLE "software"."outreach_sequences" TO "authenticated";

GRANT UPDATE ON TABLE "software"."outreach_sequences" TO "authenticated";

GRANT DELETE ON TABLE "software"."outreach_sequences" TO "authenticated";

GRANT INSERT ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT SELECT ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT UPDATE ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT DELETE ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT REFERENCES ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT TRIGGER ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."outreach_sequences" TO "service_role";

GRANT INSERT ON TABLE "software"."deals" TO "authenticated";

GRANT SELECT ON TABLE "software"."deals" TO "authenticated";

GRANT UPDATE ON TABLE "software"."deals" TO "authenticated";

GRANT DELETE ON TABLE "software"."deals" TO "authenticated";

GRANT INSERT ON TABLE "software"."deals" TO "service_role";

GRANT SELECT ON TABLE "software"."deals" TO "service_role";

GRANT UPDATE ON TABLE "software"."deals" TO "service_role";

GRANT DELETE ON TABLE "software"."deals" TO "service_role";

GRANT TRUNCATE ON TABLE "software"."deals" TO "service_role";

GRANT REFERENCES ON TABLE "software"."deals" TO "service_role";

GRANT TRIGGER ON TABLE "software"."deals" TO "service_role";

GRANT MAINTAIN ON TABLE "software"."deals" TO "service_role";

GRANT UPDATE ("is_read") ON TABLE "realestate"."alerts" TO "authenticated";

GRANT UPDATE ("created_at") ON TABLE "realestate"."alerts" TO "service_role";

GRANT UPDATE ("id") ON TABLE "realestate"."alerts" TO "service_role";

GRANT UPDATE ("is_read") ON TABLE "realestate"."alerts" TO "service_role";

GRANT UPDATE ("listing_id") ON TABLE "realestate"."alerts" TO "service_role";

GRANT UPDATE ("saved_search_id") ON TABLE "realestate"."alerts" TO "service_role";

GRANT UPDATE ("user_id") ON TABLE "realestate"."alerts" TO "service_role";

GRANT USAGE ON SCHEMA "software" TO "authenticated";

GRANT USAGE ON SCHEMA "software" TO "service_role";

GRANT USAGE ON SCHEMA "software" TO "anon";

GRANT USAGE ON SCHEMA "realestate" TO "anon";

GRANT USAGE ON SCHEMA "realestate" TO "authenticated";

GRANT USAGE ON SCHEMA "realestate" TO "service_role";

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('avatars','avatars',false,5242880,NULL) ON CONFLICT(id) DO NOTHING;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('website-slides','website-slides',false,10485760,NULL) ON CONFLICT(id) DO NOTHING;

COMMIT;
