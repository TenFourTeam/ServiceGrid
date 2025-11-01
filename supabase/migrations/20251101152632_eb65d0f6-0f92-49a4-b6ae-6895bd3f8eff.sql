-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  unit_type TEXT NOT NULL DEFAULT 'piece',
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  min_quantity NUMERIC,
  max_quantity NUMERIC,
  unit_cost INTEGER,
  supplier TEXT,
  location TEXT,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id)
);

-- Create inventory_transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_inventory_items_business ON public.inventory_items(business_id);
CREATE INDEX idx_inventory_items_active ON public.inventory_items(business_id, is_active);
CREATE INDEX idx_inventory_transactions_item ON public.inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_business ON public.inventory_transactions(business_id);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Business members can read inventory items"
  ON public.inventory_items
  FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business owners can manage inventory items"
  ON public.inventory_items
  FOR ALL
  USING (can_manage_business(business_id))
  WITH CHECK (can_manage_business(business_id));

-- RLS Policies for inventory_transactions
CREATE POLICY "Business members can read transactions"
  ON public.inventory_transactions
  FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business members can insert transactions"
  ON public.inventory_transactions
  FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business owners can manage transactions"
  ON public.inventory_transactions
  FOR ALL
  USING (can_manage_business(business_id))
  WITH CHECK (can_manage_business(business_id));

-- Add updated_at trigger for inventory_items
CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();