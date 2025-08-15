-- ====================================================================
-- BASELINE MIGRATION: Consolidated schema from 65+ migration files
-- Created: 2025-01-15
-- Purpose: Single source of truth for the complete database schema
-- ====================================================================

-- Create custom types (enums)
CREATE TYPE public.business_role AS ENUM ('owner', 'admin', 'worker');
CREATE TYPE public.invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled');
CREATE TYPE public.job_status AS ENUM ('Scheduled', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'succeeded', 'failed', 'cancelled');
CREATE TYPE public.payment_terms AS ENUM ('net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt');
CREATE TYPE public.quote_frequency AS ENUM ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE public.quote_status AS ENUM ('Draft', 'Sent', 'Viewed', 'Approved', 'Declined', 'Expired');

-- ====================================================================
-- CORE BUSINESS TABLES
-- ====================================================================

-- Profiles table for user information
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    clerk_user_id text,
    full_name text,
    phone_e164 text,
    business_name text,
    business_name_customized boolean DEFAULT false,
    default_business_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Businesses table
CREATE TABLE public.businesses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    name text NOT NULL DEFAULT 'My Business'::text,
    logo_url text,
    light_logo_url text,
    phone text,
    reply_to_email text,
    tax_rate_default numeric NOT NULL DEFAULT 0.0,
    est_prefix text NOT NULL DEFAULT 'QUO-'::text,
    est_seq integer NOT NULL DEFAULT 1,
    inv_prefix text NOT NULL DEFAULT 'INV-'::text,
    inv_seq integer NOT NULL DEFAULT 1,
    stripe_account_id text,
    stripe_charges_enabled boolean NOT NULL DEFAULT false,
    stripe_payouts_enabled boolean NOT NULL DEFAULT false,
    stripe_details_submitted boolean NOT NULL DEFAULT false,
    application_fee_bps integer NOT NULL DEFAULT 0,
    name_customized boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (stripe_account_id)
);

-- Business members (team management)
CREATE TABLE public.business_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.business_role NOT NULL DEFAULT 'worker'::business_role,
    invited_at timestamp with time zone NOT NULL DEFAULT now(),
    joined_at timestamp with time zone,
    invited_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (business_id, user_id),
    UNIQUE (user_id) WHERE (role = 'owner'::business_role)
);

-- Invites table for team invitations
CREATE TABLE public.invites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    email text NOT NULL,
    role public.business_role NOT NULL DEFAULT 'worker'::business_role,
    token_hash text NOT NULL,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
    redeemed_at timestamp with time zone,
    redeemed_by uuid,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (token_hash)
);

-- ====================================================================
-- CUSTOMER MANAGEMENT
-- ====================================================================

-- Customers table
CREATE TABLE public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- ====================================================================
-- QUOTES AND JOBS
-- ====================================================================

-- Quotes table
CREATE TABLE public.quotes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    number text NOT NULL,
    status public.quote_status NOT NULL DEFAULT 'Draft'::quote_status,
    address text,
    notes_internal text,
    terms text,
    files jsonb NOT NULL DEFAULT '[]'::jsonb,
    subtotal integer NOT NULL DEFAULT 0,
    discount integer NOT NULL DEFAULT 0,
    tax_rate numeric NOT NULL DEFAULT 0.0,
    total integer NOT NULL DEFAULT 0,
    deposit_required boolean NOT NULL DEFAULT false,
    deposit_percent smallint,
    frequency public.quote_frequency,
    payment_terms public.payment_terms,
    public_token text NOT NULL DEFAULT (gen_random_uuid())::text,
    view_count integer NOT NULL DEFAULT 0,
    sent_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Quote line items
CREATE TABLE public.quote_line_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    name text NOT NULL,
    unit text,
    qty numeric NOT NULL DEFAULT 1,
    unit_price integer NOT NULL,
    line_total integer NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Quote events (tracking)
CREATE TABLE public.quote_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quote_id text NOT NULL,
    token text NOT NULL,
    type text NOT NULL,
    meta jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Jobs table
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    quote_id uuid,
    title text,
    address text,
    notes text,
    status public.job_status NOT NULL DEFAULT 'Scheduled'::job_status,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    total integer,
    recurrence text,
    photos jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- ====================================================================
-- INVOICING AND PAYMENTS
-- ====================================================================

-- Invoices table
CREATE TABLE public.invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    job_id uuid,
    number text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'Draft'::invoice_status,
    subtotal integer NOT NULL DEFAULT 0,
    discount integer NOT NULL DEFAULT 0,
    tax_rate numeric NOT NULL DEFAULT 0.0,
    total integer NOT NULL DEFAULT 0,
    public_token text NOT NULL DEFAULT (gen_random_uuid())::text,
    due_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Invoice line items
CREATE TABLE public.invoice_line_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    name text NOT NULL,
    unit text,
    qty numeric NOT NULL DEFAULT 1,
    unit_price integer NOT NULL,
    line_total integer NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Payments table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    amount integer NOT NULL,
    status public.payment_status NOT NULL,
    method text NOT NULL DEFAULT 'Card'::text,
    last4 text,
    received_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- ====================================================================
-- SUBSCRIPTION AND AUDIT
-- ====================================================================

-- Subscribers table
CREATE TABLE public.subscribers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email text NOT NULL,
    subscribed boolean NOT NULL DEFAULT false,
    subscription_tier text,
    subscription_end timestamp with time zone,
    stripe_customer_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Mail sends table
CREATE TABLE public.mail_sends (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    to_email text NOT NULL,
    subject text NOT NULL,
    request_hash text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    provider_message_id text,
    error_code text,
    error_message text,
    quote_id text,
    invoice_id uuid,
    job_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- ====================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ====================================================================

-- Business members indexes
CREATE INDEX idx_business_members_business_user ON public.business_members USING btree (business_id, user_id);
CREATE INDEX idx_business_members_user_id ON public.business_members USING btree (user_id);
CREATE INDEX idx_members_business ON public.business_members USING btree (business_id);
CREATE INDEX idx_members_user ON public.business_members USING btree (user_id);

-- Business indexes
CREATE INDEX idx_businesses_owner_id ON public.businesses USING btree (owner_id);
CREATE INDEX idx_businesses_updated_at ON public.businesses USING btree (updated_at);

-- Customer indexes
CREATE INDEX idx_customers_business_id ON public.customers USING btree (business_id);
CREATE INDEX idx_customers_owner_id ON public.customers USING btree (owner_id);
CREATE INDEX idx_customers_owner_updated ON public.customers USING btree (owner_id, updated_at DESC);
CREATE INDEX idx_customers_updated_at ON public.customers USING btree (updated_at);

-- Quote indexes
CREATE INDEX idx_quotes_business_id ON public.quotes USING btree (business_id);
CREATE INDEX idx_quotes_customer_id ON public.quotes USING btree (customer_id);
CREATE INDEX idx_quotes_owner_id ON public.quotes USING btree (owner_id);
CREATE INDEX idx_quotes_owner_updated ON public.quotes USING btree (owner_id, updated_at DESC);
CREATE INDEX idx_quotes_public_token ON public.quotes USING btree (public_token);
CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);
CREATE INDEX idx_quotes_updated_at ON public.quotes USING btree (updated_at);

-- Quote line items indexes
CREATE INDEX idx_quote_line_items_quote_id ON public.quote_line_items USING btree (quote_id);
CREATE INDEX idx_quote_line_items_owner_id ON public.quote_line_items USING btree (owner_id);

-- Job indexes
CREATE INDEX idx_jobs_business_id ON public.jobs USING btree (business_id);
CREATE INDEX idx_jobs_customer_id ON public.jobs USING btree (customer_id);
CREATE INDEX idx_jobs_owner_id ON public.jobs USING btree (owner_id);
CREATE INDEX idx_jobs_quote_id ON public.jobs USING btree (quote_id);
CREATE INDEX idx_jobs_starts_at ON public.jobs USING btree (starts_at);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_jobs_updated_at ON public.jobs USING btree (updated_at);

-- Invoice indexes
CREATE INDEX idx_invoices_business_id ON public.invoices USING btree (business_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices USING btree (customer_id);
CREATE INDEX idx_invoices_job_id ON public.invoices USING btree (job_id);
CREATE INDEX idx_invoices_owner_id ON public.invoices USING btree (owner_id);
CREATE INDEX idx_invoices_owner_updated ON public.invoices USING btree (owner_id, updated_at DESC);
CREATE INDEX idx_invoices_public_token ON public.invoices USING btree (public_token);
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX idx_invoices_updated_at ON public.invoices USING btree (updated_at);

-- Invoice line items indexes
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items USING btree (invoice_id);
CREATE INDEX idx_invoice_line_items_owner_id ON public.invoice_line_items USING btree (owner_id);

-- Payment indexes
CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id);
CREATE INDEX idx_payments_owner_id ON public.payments USING btree (owner_id);
CREATE INDEX idx_payments_status ON public.payments USING btree (status);
CREATE INDEX idx_payments_updated_at ON public.payments USING btree (updated_at);

-- Invite indexes
CREATE INDEX idx_invites_business_email ON public.invites USING btree (business_id, email);
CREATE INDEX idx_invites_expires_at ON public.invites USING btree (expires_at);
CREATE INDEX idx_invites_token_hash ON public.invites USING btree (token_hash);

-- Audit log indexes
CREATE INDEX idx_audit_logs_business_id ON public.audit_logs USING btree (business_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);

-- Mail sends indexes
CREATE INDEX idx_mail_sends_user_id ON public.mail_sends USING btree (user_id);
CREATE INDEX idx_mail_sends_status ON public.mail_sends USING btree (status);
CREATE INDEX idx_mail_sends_created_at ON public.mail_sends USING btree (created_at);

-- Profile indexes
CREATE INDEX idx_profiles_clerk_user_id ON public.profiles USING btree (clerk_user_id);
CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX idx_profiles_default_business_id ON public.profiles USING btree (default_business_id);

-- ====================================================================
-- CREATE DATABASE FUNCTIONS
-- ====================================================================

-- Function to get next estimate number
CREATE OR REPLACE FUNCTION public.next_est_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  UPDATE public.businesses b
  SET est_seq = b.est_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  RETURNING b.est_prefix, b.est_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION public.next_inv_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  UPDATE public.businesses b
  SET inv_seq = b.inv_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  RETURNING b.inv_prefix, b.inv_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;

-- Function to ensure default business
CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b public.businesses%ROWTYPE;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look for existing business via membership (not ownership)
  SELECT b.*
  INTO b
  FROM public.businesses b
  JOIN public.business_members bm ON bm.business_id = b.id
  WHERE bm.user_id = user_id_val AND bm.role = 'owner'
  ORDER BY b.created_at
  LIMIT 1;

  -- If no business exists, create one atomically with membership
  IF NOT FOUND THEN
    -- Insert business
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', user_id_val)
    RETURNING * INTO b;
    
    -- Insert owner membership (will fail if duplicate due to unique constraint)
    INSERT INTO public.business_members (
      business_id, 
      user_id, 
      role, 
      joined_at
    ) VALUES (
      b.id, 
      user_id_val, 
      'owner',
      now()
    ) ON CONFLICT (user_id) WHERE role = 'owner' DO NOTHING;
    
    -- Update profile default_business_id if not set
    UPDATE public.profiles 
    SET default_business_id = b.id 
    WHERE id = user_id_val AND default_business_id IS NULL;
  END IF;

  RETURN b;
END;
$$;

-- Business role checking functions
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid)
RETURNS business_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.business_members 
  WHERE business_id = p_business_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.business_members 
     WHERE business_id = p_business_id AND user_id = auth.uid()) = 'owner',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members 
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$$;

-- Business name normalization function
CREATE OR REPLACE FUNCTION public.normalize_business_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- default if missing/empty
  IF NEW.name IS NULL OR BTRIM(NEW.name) = '' THEN
    NEW.name := 'My Business';
  END IF;

  -- flag customized iff not the default (case-insensitive)
  IF LOWER(NEW.name) = 'my business' THEN
    NEW.name_customized := false;
  ELSE
    NEW.name_customized := true;
  END IF;

  RETURN NEW;
END
$$;

-- Default business membership validation
CREATE OR REPLACE FUNCTION public.ensure_default_business_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If setting a default_business_id, ensure user has membership in that business
  IF NEW.default_business_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_members 
      WHERE user_id = NEW.id AND business_id = NEW.default_business_id
    ) THEN
      RAISE EXCEPTION 'Cannot set default_business_id to a business where user has no membership';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_business_id uuid, 
  p_user_id uuid, 
  p_action text, 
  p_resource_type text, 
  p_resource_id text DEFAULT NULL::text, 
  p_details jsonb DEFAULT '{}'::jsonb, 
  p_ip_address text DEFAULT NULL::text, 
  p_user_agent text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    business_id, user_id, action, resource_type, resource_id,
    details, ip_address, user_agent
  ) VALUES (
    p_business_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Business audit trigger function
CREATE OR REPLACE FUNCTION public.trigger_business_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log business creation/updates
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id
      'create', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      to_jsonb(NEW) -- details
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id
      'update', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)) -- details
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ====================================================================
-- CREATE TRIGGERS
-- ====================================================================

-- Business name normalization trigger
CREATE TRIGGER normalize_business_name_trigger
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_business_name();

-- Profile default business validation trigger
CREATE TRIGGER ensure_default_business_membership_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_business_membership();

-- Business audit trigger
CREATE TRIGGER business_audit_trigger
  AFTER INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_business_audit();

-- Updated at triggers for all tables
CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON public.mail_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- ENABLE ROW LEVEL SECURITY
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ====================================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Business policies
CREATE POLICY "Business members can read businesses" ON public.businesses
  FOR SELECT USING (is_business_member(id));

CREATE POLICY "Owner can insert businesses" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Business owners can update businesses" ON public.businesses
  FOR UPDATE USING (can_manage_business(id));

CREATE POLICY "Business owners can delete businesses" ON public.businesses
  FOR DELETE USING (can_manage_business(id));

-- Business members policies
CREATE POLICY "Business members can view their own memberships" ON public.business_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Business owners can view all members" ON public.business_members
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM business_members bm 
    WHERE bm.business_id = business_members.business_id 
    AND bm.user_id = auth.uid() 
    AND bm.role = 'owner'::business_role
  ));

CREATE POLICY "Business owners can manage members" ON public.business_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM business_members bm 
    WHERE bm.business_id = business_members.business_id 
    AND bm.user_id = auth.uid() 
    AND bm.role = 'owner'::business_role
  ));

-- Invites policies
CREATE POLICY "Business owners can manage invites" ON public.invites
  FOR ALL USING (can_manage_business(business_id))
  WITH CHECK (can_manage_business(business_id));

-- Customer policies
CREATE POLICY "Business members can read customers" ON public.customers
  FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can insert customers" ON public.customers
  FOR INSERT WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update customers" ON public.customers
  FOR UPDATE USING (is_business_member(business_id));

CREATE POLICY "Business members can delete customers" ON public.customers
  FOR DELETE USING (is_business_member(business_id));

-- Quote policies
CREATE POLICY "Business members can read quotes" ON public.quotes
  FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can insert quotes" ON public.quotes
  FOR INSERT WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update quotes" ON public.quotes
  FOR UPDATE USING (is_business_member(business_id));

CREATE POLICY "Business members can delete quotes" ON public.quotes
  FOR DELETE USING (is_business_member(business_id));

-- Quote line items policies
CREATE POLICY "Business members can read quote_line_items" ON public.quote_line_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_line_items.quote_id 
    AND is_business_member(q.business_id)
  ));

CREATE POLICY "Business members can insert quote_line_items" ON public.quote_line_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_line_items.quote_id 
    AND is_business_member(q.business_id)
  ));

CREATE POLICY "Business members can update quote_line_items" ON public.quote_line_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_line_items.quote_id 
    AND is_business_member(q.business_id)
  ));

CREATE POLICY "Business members can delete quote_line_items" ON public.quote_line_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_line_items.quote_id 
    AND is_business_member(q.business_id)
  ));

-- Quote events policies
CREATE POLICY "Owner can read their quote events" ON public.quote_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id::text = quote_events.quote_id 
    AND q.owner_id = auth.uid()
  ));

-- Job policies
CREATE POLICY "Business members can read jobs" ON public.jobs
  FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update jobs" ON public.jobs
  FOR UPDATE USING (is_business_member(business_id));

CREATE POLICY "Business members can delete jobs" ON public.jobs
  FOR DELETE USING (is_business_member(business_id));

-- Invoice policies
CREATE POLICY "Business members can read invoices" ON public.invoices
  FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Business members can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update invoices" ON public.invoices
  FOR UPDATE USING (is_business_member(business_id));

CREATE POLICY "Business members can delete invoices" ON public.invoices
  FOR DELETE USING (is_business_member(business_id));

-- Invoice line items policies
CREATE POLICY "Business members can read invoice_line_items" ON public.invoice_line_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND is_business_member(i.business_id)
  ));

CREATE POLICY "Business members can insert invoice_line_items" ON public.invoice_line_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND is_business_member(i.business_id)
  ));

CREATE POLICY "Business members can update invoice_line_items" ON public.invoice_line_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND is_business_member(i.business_id)
  ));

CREATE POLICY "Business members can delete invoice_line_items" ON public.invoice_line_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND is_business_member(i.business_id)
  ));

-- Payment policies
CREATE POLICY "Business members can read payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = payments.invoice_id 
    AND is_business_member(i.business_id)
  ));

CREATE POLICY "Business owners can insert payments" ON public.payments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = payments.invoice_id 
    AND can_manage_business(i.business_id)
  ));

CREATE POLICY "Business owners can update payments" ON public.payments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = payments.invoice_id 
    AND can_manage_business(i.business_id)
  ));

CREATE POLICY "Business owners can delete payments" ON public.payments
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = payments.invoice_id 
    AND can_manage_business(i.business_id)
  ));

-- Subscriber policies
CREATE POLICY "select_own_subscription" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "insert_own_subscription" ON public.subscribers
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "update_own_subscription" ON public.subscribers
  FOR UPDATE USING (auth.uid() = user_id OR auth.email() = email);

-- Mail sends policies
CREATE POLICY "Mail sends are viewable by owner" ON public.mail_sends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert their own mail sends" ON public.mail_sends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update their own mail sends" ON public.mail_sends
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete their own mail sends" ON public.mail_sends
  FOR DELETE USING (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Business members can read audit logs" ON public.audit_logs
  FOR SELECT USING (is_business_member(business_id));

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);