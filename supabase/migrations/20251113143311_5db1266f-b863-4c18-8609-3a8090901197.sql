-- Seed system checklist templates
-- These templates are available to all businesses and cannot be edited (only duplicated)

-- Insert system templates
INSERT INTO sg_checklist_templates (
  business_id, 
  name, 
  description, 
  category, 
  is_system_template, 
  created_by
) 
SELECT 
  (SELECT id FROM businesses LIMIT 1) as business_id,
  unnest(ARRAY[
    'General Service Checklist',
    'Safety Inspection',
    'Equipment Maintenance',
    'Customer Property Check-In',
    'Final Walkthrough & Sign-Off'
  ]) as name,
  unnest(ARRAY[
    'Standard checklist for routine service jobs and installations',
    'Pre-job safety assessment and hazard identification',
    'Routine equipment inspection and maintenance verification',
    'Document property condition before starting work',
    'Final quality check and customer approval before completion'
  ]) as description,
  unnest(ARRAY[
    'General',
    'Safety',
    'Maintenance',
    'Documentation',
    'Completion'
  ]) as category,
  true as is_system_template,
  (SELECT id FROM profiles LIMIT 1) as created_by;

-- Insert items for "General Service Checklist"
INSERT INTO sg_checklist_template_items (
  template_id, 
  title, 
  description, 
  position, 
  required_photo_count, 
  estimated_duration_minutes,
  category
)
SELECT 
  t.id as template_id,
  unnest(ARRAY[
    'Review work order and customer requirements',
    'Verify all tools and materials are available',
    'Complete primary service tasks',
    'Test and verify work quality',
    'Document completion with photos',
    'Clean and restore work area',
    'Obtain customer signature or approval'
  ]) as title,
  unnest(ARRAY[
    'Confirm scope of work matches customer expectations',
    'Check inventory and ensure nothing is missing',
    'Execute all tasks per work order specifications',
    'Run tests to ensure everything functions properly',
    'Capture before/after photos of completed work',
    'Remove debris and return area to original condition',
    'Get sign-off from customer or site contact'
  ]) as description,
  generate_series(0, 6) as position,
  unnest(ARRAY[0, 0, 0, 0, 2, 1, 0]) as required_photo_count,
  unnest(ARRAY[5, 5, 30, 10, 5, 10, 5]) as estimated_duration_minutes,
  unnest(ARRAY[
    'Preparation',
    'Preparation',
    'Execution',
    'Quality Check',
    'Documentation',
    'Cleanup',
    'Completion'
  ]) as category
FROM sg_checklist_templates t
WHERE t.name = 'General Service Checklist' AND t.is_system_template = true
LIMIT 1;

-- Insert items for "Safety Inspection"
INSERT INTO sg_checklist_template_items (
  template_id, 
  title, 
  description, 
  position, 
  required_photo_count, 
  estimated_duration_minutes,
  category
)
SELECT 
  t.id as template_id,
  unnest(ARRAY[
    'Identify potential hazards on site',
    'Verify PPE availability and condition',
    'Check emergency exits and routes',
    'Inspect electrical systems and outlets',
    'Assess ladder and scaffolding safety',
    'Document safety concerns with photos',
    'Brief team on safety protocols'
  ]) as title,
  unnest(ARRAY[
    'Walk the site and note any dangerous conditions',
    'Ensure all crew members have proper safety equipment',
    'Confirm clear egress paths in case of emergency',
    'Look for exposed wires, damaged outlets, or trip hazards',
    'Ensure all elevated work equipment is stable and rated',
    'Photograph any hazards for records and mitigation',
    'Conduct quick safety meeting with all personnel'
  ]) as description,
  generate_series(0, 6) as position,
  unnest(ARRAY[1, 0, 0, 0, 0, 2, 0]) as required_photo_count,
  unnest(ARRAY[10, 5, 5, 5, 5, 5, 5]) as estimated_duration_minutes,
  unnest(ARRAY[
    'Assessment',
    'Equipment',
    'Site Review',
    'Site Review',
    'Equipment',
    'Documentation',
    'Team Coordination'
  ]) as category
FROM sg_checklist_templates t
WHERE t.name = 'Safety Inspection' AND t.is_system_template = true
LIMIT 1;

-- Insert items for "Equipment Maintenance"
INSERT INTO sg_checklist_template_items (
  template_id, 
  title, 
  description, 
  position, 
  required_photo_count, 
  estimated_duration_minutes,
  category
)
SELECT 
  t.id as template_id,
  unnest(ARRAY[
    'Check fluid levels and top off if needed',
    'Inspect hoses and belts for wear',
    'Test all safety features and shutoffs',
    'Lubricate moving parts',
    'Clean filters and replace if necessary',
    'Document meter readings and hours',
    'Photograph equipment condition',
    'Update maintenance log'
  ]) as title,
  unnest(ARRAY[
    'Oil, coolant, hydraulic fluid, etc.',
    'Look for cracks, fraying, or loose connections',
    'Verify emergency stops and guards are functional',
    'Apply grease to fittings and pivot points',
    'Check air/fuel/oil filters for debris',
    'Record current hours and any unusual readings',
    'Take photos of equipment serial plates and overall condition',
    'Log this maintenance event in equipment records'
  ]) as description,
  generate_series(0, 7) as position,
  unnest(ARRAY[0, 0, 0, 0, 0, 0, 2, 0]) as required_photo_count,
  unnest(ARRAY[5, 5, 5, 10, 10, 3, 2, 3]) as estimated_duration_minutes,
  unnest(ARRAY[
    'Fluids',
    'Inspection',
    'Safety',
    'Maintenance',
    'Maintenance',
    'Documentation',
    'Documentation',
    'Completion'
  ]) as category
FROM sg_checklist_templates t
WHERE t.name = 'Equipment Maintenance' AND t.is_system_template = true
LIMIT 1;

-- Insert items for "Customer Property Check-In"
INSERT INTO sg_checklist_template_items (
  template_id, 
  title, 
  description, 
  position, 
  required_photo_count, 
  estimated_duration_minutes,
  category
)
SELECT 
  t.id as template_id,
  unnest(ARRAY[
    'Photograph property exterior condition',
    'Document interior work area condition',
    'Note existing damage or concerns',
    'Identify valuable items in work area',
    'Photograph meter readings (water, electric, gas)',
    'Confirm customer awareness of check-in photos'
  ]) as title,
  unnest(ARRAY[
    'Take wide shots of property from multiple angles',
    'Capture floor, walls, fixtures before work begins',
    'Record any pre-existing scratches, stains, or damage',
    'Note furniture, electronics, or fragile items to protect',
    'Capture baseline readings to prove no leaks or issues',
    'Have customer acknowledge photo documentation process'
  ]) as description,
  generate_series(0, 5) as position,
  unnest(ARRAY[3, 3, 2, 1, 1, 0]) as required_photo_count,
  unnest(ARRAY[5, 5, 5, 3, 3, 2]) as estimated_duration_minutes,
  unnest(ARRAY[
    'Exterior',
    'Interior',
    'Documentation',
    'Protection',
    'Utilities',
    'Customer'
  ]) as category
FROM sg_checklist_templates t
WHERE t.name = 'Customer Property Check-In' AND t.is_system_template = true
LIMIT 1;

-- Insert items for "Final Walkthrough & Sign-Off"
INSERT INTO sg_checklist_template_items (
  template_id, 
  title, 
  description, 
  position, 
  required_photo_count, 
  estimated_duration_minutes,
  category
)
SELECT 
  t.id as template_id,
  unnest(ARRAY[
    'Verify all work completed per scope',
    'Test all systems and functions',
    'Take final completion photos',
    'Clean and remove all debris',
    'Walk customer through completed work',
    'Collect payment or confirm billing',
    'Obtain customer signature',
    'Leave contact info for follow-up'
  ]) as title,
  unnest(ARRAY[
    'Cross-check work order against what was actually done',
    'Run equipment, flip switches, verify everything works',
    'Document finished installation or repair with clear photos',
    'Sweep, vacuum, wipe down—leave it cleaner than found',
    'Show customer what was done and answer questions',
    'Process payment or confirm invoice will be sent',
    'Get signature on completion form or mobile app',
    'Provide business card and follow-up survey link'
  ]) as description,
  generate_series(0, 7) as position,
  unnest(ARRAY[0, 0, 3, 1, 0, 0, 0, 0]) as required_photo_count,
  unnest(ARRAY[5, 10, 5, 10, 10, 5, 3, 2]) as estimated_duration_minutes,
  unnest(ARRAY[
    'Quality Check',
    'Quality Check',
    'Documentation',
    'Cleanup',
    'Customer',
    'Payment',
    'Completion',
    'Follow-up'
  ]) as category
FROM sg_checklist_templates t
WHERE t.name = 'Final Walkthrough & Sign-Off' AND t.is_system_template = true
LIMIT 1;