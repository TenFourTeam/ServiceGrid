-- Phase 1: Database Integrity Fixes

-- Step 1: Add business_id foreign key constraints where missing
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_business_id_fkey;
ALTER TABLE customers ADD CONSTRAINT customers_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_business_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_business_id_fkey;
ALTER TABLE jobs ADD CONSTRAINT jobs_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_business_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Step 2: Ensure all businesses have owner memberships
INSERT INTO business_members (business_id, user_id, role, joined_at, invited_at)
SELECT 
  b.id as business_id,
  b.owner_id as user_id,
  'owner'::business_role as role,
  b.created_at as joined_at,
  b.created_at as invited_at
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM business_members bm 
  WHERE bm.business_id = b.id 
  AND bm.user_id = b.owner_id 
  AND bm.role = 'owner'
);

-- Step 3: Update all customer records to have correct business_id
UPDATE customers SET business_id = (
  SELECT b.id 
  FROM businesses b 
  WHERE b.owner_id = customers.owner_id 
  ORDER BY b.created_at ASC 
  LIMIT 1
) WHERE business_id IS NULL OR business_id NOT IN (
  SELECT id FROM businesses WHERE owner_id = customers.owner_id
);

-- Step 4: Update all quote records to have correct business_id
UPDATE quotes SET business_id = (
  SELECT b.id 
  FROM businesses b 
  WHERE b.owner_id = quotes.owner_id 
  ORDER BY b.created_at ASC 
  LIMIT 1
) WHERE business_id IS NULL OR business_id NOT IN (
  SELECT id FROM businesses WHERE owner_id = quotes.owner_id
);

-- Step 5: Update all job records to have correct business_id
UPDATE jobs SET business_id = (
  SELECT b.id 
  FROM businesses b 
  WHERE b.owner_id = jobs.owner_id 
  ORDER BY b.created_at ASC 
  LIMIT 1
) WHERE business_id IS NULL OR business_id NOT IN (
  SELECT id FROM businesses WHERE owner_id = jobs.owner_id
);

-- Step 6: Update all invoice records to have correct business_id
UPDATE invoices SET business_id = (
  SELECT b.id 
  FROM businesses b 
  WHERE b.owner_id = invoices.owner_id 
  ORDER BY b.created_at ASC 
  LIMIT 1
) WHERE business_id IS NULL OR business_id NOT IN (
  SELECT id FROM businesses WHERE owner_id = invoices.owner_id
);

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_business_id ON quotes(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_user ON business_members(business_id, user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);

-- Step 8: Create audit trigger for business operations
CREATE OR REPLACE FUNCTION trigger_business_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log business creation/updates
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id
      'create', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      to_jsonb(NEW) -- details
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_action(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS business_audit_trigger ON businesses;
CREATE TRIGGER business_audit_trigger
  AFTER INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_audit();