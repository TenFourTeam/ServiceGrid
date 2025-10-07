-- Add click_count column to track referral link clicks
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Update existing referrals to have click_count = 0
UPDATE referrals SET click_count = 0 WHERE click_count IS NULL;