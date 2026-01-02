-- =============================================
-- CLEANUP ORPHAN AUTH/PROFILE/BUSINESS DATA
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ijudkzqfriazabiosnvb/sql/new
-- =============================================

-- First, show what we're about to delete (DRY RUN)
-- Run these SELECT statements first to preview what will be deleted

-- 1. ORPHAN PROFILES (profiles not linked to any auth.users)
SELECT 'ORPHAN PROFILES TO DELETE:' as action;
SELECT id, email, full_name, created_at 
FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. ORPHAN BUSINESSES (owner_id not in auth.users)
SELECT 'ORPHAN BUSINESSES TO DELETE:' as action;
SELECT id, name, owner_id, created_at 
FROM businesses 
WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- 3. ORPHAN BUSINESS_PERMISSIONS
SELECT 'ORPHAN PERMISSIONS TO DELETE:' as action;
SELECT id, user_id, business_id, created_at 
FROM business_permissions 
WHERE user_id NOT IN (SELECT id FROM auth.users)
   OR business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- 4. DEPENDENT ROWS IN OTHER TABLES (linked to orphan businesses)
SELECT 'DEPENDENT ROWS TO DELETE:' as action;

SELECT 'automation_settings' as table_name, COUNT(*) as row_count
FROM automation_settings 
WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

SELECT 'audit_logs' as table_name, COUNT(*) as row_count
FROM audit_logs 
WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- =============================================
-- ACTUAL DELETION (uncomment to run)
-- =============================================

-- BEGIN;

-- -- Delete dependent rows for orphan businesses (must delete these first due to foreign keys)
-- DELETE FROM automation_settings 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM audit_logs 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM ai_activity_log 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM ai_chat_conversations 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM business_constraints 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM customers 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM jobs 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM quotes 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM invoices 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- DELETE FROM requests 
-- WHERE business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- -- Delete orphan permissions
-- DELETE FROM business_permissions 
-- WHERE user_id NOT IN (SELECT id FROM auth.users)
--    OR business_id IN (SELECT id FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users));

-- -- Delete orphan businesses
-- DELETE FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- -- Delete orphan profiles
-- DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- -- Verify cleanup
-- SELECT 'VERIFICATION - Remaining orphans (should be 0):' as status;
-- SELECT COUNT(*) as orphan_profiles FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
-- SELECT COUNT(*) as orphan_businesses FROM businesses WHERE owner_id NOT IN (SELECT id FROM auth.users);
-- SELECT COUNT(*) as orphan_permissions FROM business_permissions WHERE user_id NOT IN (SELECT id FROM auth.users);

-- COMMIT;
