-- Phase 6: Advanced Scheduling Features Database Schema

-- =====================================================
-- 1. TEAM AVAILABILITY TABLE
-- =====================================================
CREATE TABLE public.team_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id, day_of_week, start_time)
);

-- RLS policies for team_availability
ALTER TABLE public.team_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read team availability"
  ON public.team_availability FOR SELECT
  USING (public.is_business_member(business_id));

CREATE POLICY "Business owners can manage team availability"
  ON public.team_availability FOR ALL
  USING (public.can_manage_business(business_id))
  WITH CHECK (public.can_manage_business(business_id));

CREATE POLICY "Users can manage their own availability"
  ON public.team_availability FOR ALL
  USING (user_id = public.current_user_profile_id())
  WITH CHECK (user_id = public.current_user_profile_id());

-- Index for availability queries
CREATE INDEX idx_team_availability_lookup ON public.team_availability(business_id, user_id, day_of_week);

-- =====================================================
-- 2. TIME OFF REQUESTS TABLE
-- =====================================================
CREATE TYPE public.time_off_status AS ENUM ('pending', 'approved', 'denied');

CREATE TABLE public.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status public.time_off_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- RLS policies for time_off_requests
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read time off requests"
  ON public.time_off_requests FOR SELECT
  USING (public.is_business_member(business_id));

CREATE POLICY "Business owners can manage time off requests"
  ON public.time_off_requests FOR ALL
  USING (public.can_manage_business(business_id))
  WITH CHECK (public.can_manage_business(business_id));

CREATE POLICY "Users can create their own time off requests"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (user_id = public.current_user_profile_id() AND public.is_business_member(business_id));

CREATE POLICY "Users can update their pending time off requests"
  ON public.time_off_requests FOR UPDATE
  USING (user_id = public.current_user_profile_id() AND status = 'pending')
  WITH CHECK (user_id = public.current_user_profile_id());

-- Index for time off queries
CREATE INDEX idx_time_off_lookup ON public.time_off_requests(business_id, user_id, start_date, end_date);
CREATE INDEX idx_time_off_status ON public.time_off_requests(business_id, status) WHERE status = 'approved';

-- =====================================================
-- 3. BUSINESS CONSTRAINTS TABLE
-- =====================================================
CREATE TYPE public.constraint_type AS ENUM (
  'max_jobs_per_day',
  'max_hours_per_day',
  'min_time_between_jobs',
  'max_travel_time',
  'business_hours',
  'buffer_time'
);

CREATE TABLE public.business_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  constraint_type public.constraint_type NOT NULL,
  constraint_value JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, constraint_type)
);

-- RLS policies for business_constraints
ALTER TABLE public.business_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read constraints"
  ON public.business_constraints FOR SELECT
  USING (public.is_business_member(business_id));

CREATE POLICY "Business owners can manage constraints"
  ON public.business_constraints FOR ALL
  USING (public.can_manage_business(business_id))
  WITH CHECK (public.can_manage_business(business_id));

-- Index for constraint queries
CREATE INDEX idx_business_constraints_lookup ON public.business_constraints(business_id, constraint_type, is_active);

-- =====================================================
-- 4. RECURRING JOB TEMPLATES TABLE
-- =====================================================
CREATE TYPE public.recurrence_pattern AS ENUM (
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'custom'
);

CREATE TABLE public.recurring_job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
  recurrence_pattern public.recurrence_pattern NOT NULL,
  recurrence_config JSONB NOT NULL, -- stores pattern-specific config (e.g., days of week)
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_schedule BOOLEAN NOT NULL DEFAULT false,
  preferred_time_window JSONB,
  assigned_members JSONB DEFAULT '[]'::jsonb,
  last_generated_at TIMESTAMPTZ,
  next_generation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for recurring_job_templates
ALTER TABLE public.recurring_job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read recurring templates"
  ON public.recurring_job_templates FOR SELECT
  USING (public.is_business_member(business_id));

CREATE POLICY "Business owners can manage recurring templates"
  ON public.recurring_job_templates FOR ALL
  USING (public.can_manage_business(business_id))
  WITH CHECK (public.can_manage_business(business_id));

-- Index for recurring job queries
CREATE INDEX idx_recurring_templates_lookup ON public.recurring_job_templates(business_id, is_active, next_generation_date);
CREATE INDEX idx_recurring_templates_auto ON public.recurring_job_templates(business_id, auto_schedule, next_generation_date) 
  WHERE is_active = true AND auto_schedule = true;

-- =====================================================
-- 5. ADD CUSTOMER SCHEDULING PREFERENCES
-- =====================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_days JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_time_window JSONB,
  ADD COLUMN IF NOT EXISTS avoid_days JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;

COMMENT ON COLUMN public.customers.preferred_days IS 'Array of preferred days of week [0-6]';
COMMENT ON COLUMN public.customers.preferred_time_window IS 'Object with start/end time strings';
COMMENT ON COLUMN public.customers.avoid_days IS 'Array of days to avoid [0-6]';

-- =====================================================
-- 6. ADD TEMPLATE REFERENCE TO JOBS
-- =====================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES public.recurring_job_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_jobs_recurring_template ON public.jobs(recurring_template_id) WHERE recurring_template_id IS NOT NULL;

-- =====================================================
-- 7. UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER set_team_availability_updated_at
  BEFORE UPDATE ON public.team_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_time_off_requests_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_business_constraints_updated_at
  BEFORE UPDATE ON public.business_constraints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_recurring_job_templates_updated_at
  BEFORE UPDATE ON public.recurring_job_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();