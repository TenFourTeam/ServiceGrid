-- Expand SOP template library with 20-30 industry-specific templates
-- These templates provide comprehensive, pre-built checklists for common service industries

-- Insert 25 additional industry-specific system templates
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
    'HVAC System Installation',
    'HVAC Preventive Maintenance',
    'HVAC Troubleshooting & Repair',
    'Plumbing Fixture Installation',
    'Plumbing Leak Repair',
    'Plumbing System Inspection',
    'Electrical Panel Installation',
    'Electrical Circuit Troubleshooting',
    'Electrical Outlet & Switch Installation',
    'Commercial Office Cleaning',
    'Residential Deep Cleaning',
    'Post-Construction Cleanup',
    'Interior Painting',
    'Exterior Painting',
    'Drywall Installation & Finishing',
    'Lawn Care & Maintenance',
    'Tree Trimming & Removal',
    'Landscape Installation',
    'Roof Installation (Shingle)',
    'Roof Leak Repair',
    'Roof Inspection',
    'Cabinet Installation',
    'Trim & Molding Installation',
    'Pool Maintenance Service',
    'Pest Control Inspection & Treatment'
  ]) as name,
  unnest(ARRAY[
    'Complete checklist for installing new HVAC systems including ductwork',
    'Seasonal maintenance and filter replacement for HVAC units',
    'Diagnostic procedures and repair steps for HVAC system issues',
    'Installation of sinks, toilets, faucets, and other fixtures',
    'Locate, diagnose, and repair water leaks in plumbing systems',
    'Comprehensive inspection of plumbing systems for code compliance',
    'Replace or upgrade electrical service panel with proper safety protocols',
    'Systematic approach to diagnosing and fixing electrical circuit problems',
    'Install or replace electrical outlets, switches, and cover plates',
    'Professional cleaning checklist for office and commercial spaces',
    'Deep cleaning procedures for residential properties',
    'Thorough cleanup after construction or renovation projects',
    'Interior painting preparation, application, and finishing',
    'Exterior painting including surface prep and weather considerations',
    'Drywall hanging, taping, mudding, and sanding procedures',
    'Mowing, edging, trimming, and fertilization for lawn maintenance',
    'Safe tree trimming and removal with proper equipment',
    'Plant installation, mulching, and landscape design execution',
    'Complete shingle roof installation from decking to ridge cap',
    'Identify and repair roof leaks with proper flashing and sealant',
    'Comprehensive roof condition assessment and documentation',
    'Professional cabinet installation with proper leveling and mounting',
    'Crown molding, baseboard, and trim installation procedures',
    'Chemical balance, cleaning, and equipment maintenance for pools',
    'Comprehensive pest inspection and treatment application'
  ]) as description,
  unnest(ARRAY[
    'HVAC',
    'HVAC',
    'HVAC',
    'Plumbing',
    'Plumbing',
    'Plumbing',
    'Electrical',
    'Electrical',
    'Electrical',
    'Cleaning',
    'Cleaning',
    'Cleaning',
    'Painting',
    'Painting',
    'Construction',
    'Landscaping',
    'Landscaping',
    'Landscaping',
    'Roofing',
    'Roofing',
    'Roofing',
    'Carpentry',
    'Carpentry',
    'Pool Service',
    'Pest Control'
  ]) as category,
  true as is_system_template,
  (SELECT id FROM profiles LIMIT 1) as created_by;

-- HVAC System Installation items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Site assessment and measurements', 'Disconnect old system (if applicable)', 'Install mounting brackets and supports', 'Position and level condensing unit', 'Install air handler or furnace', 'Connect refrigerant lines', 'Install and seal ductwork', 'Wire electrical connections', 'Charge refrigerant system', 'Test system operation', 'Program thermostat', 'Document installation with photos', 'Clean work area']), 
unnest(ARRAY['Verify space, power requirements, and clearances', 'Safely remove and dispose of existing equipment', 'Secure wall and ceiling mounts per manufacturer specs', 'Place outdoor unit on level pad with proper clearance', 'Position indoor unit with proper drainage', 'Connect and insulate copper refrigerant lines', 'Ensure all ducts are properly sealed and insulated', 'Connect to breaker panel with proper wire gauge', 'Evacuate lines and charge system to spec', 'Verify cooling/heating, airflow, and temperature', 'Configure schedule and temperature settings', 'Before/after photos of all equipment and connections', 'Remove debris and protect customer property']),
generate_series(0, 12), unnest(ARRAY[1,1,1,2,2,1,2,1,0,2,0,3,1]), unnest(ARRAY[15,30,20,30,45,30,60,30,20,15,10,10,15]), unnest(ARRAY['Preparation','Removal','Installation','Installation','Installation','Installation','Installation','Electrical','Testing','Testing','Configuration','Documentation','Cleanup'])
FROM sg_checklist_templates t WHERE t.name = 'HVAC System Installation' AND t.is_system_template = true LIMIT 1;

-- HVAC Preventive Maintenance items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Replace air filters', 'Clean condenser coils', 'Clean evaporator coils', 'Check refrigerant levels', 'Inspect electrical connections', 'Test thermostat operation', 'Lubricate motors and bearings', 'Check condensate drain', 'Inspect ductwork for leaks', 'Test system performance', 'Document findings with photos']),
unnest(ARRAY['Install new filters per manufacturer recommendation', 'Remove debris and clean outdoor coils', 'Clean indoor coils and check for ice buildup', 'Verify proper charge, check for leaks', 'Tighten connections, check for corrosion', 'Verify temperature accuracy and calibration', 'Apply lubricant to moving parts as needed', 'Clear drain line and check for proper drainage', 'Seal any visible air leaks in ductwork', 'Measure temperature differential and airflow', 'Photo documentation of filter condition, coils, connections']),
generate_series(0, 10), unnest(ARRAY[1,2,1,0,1,0,0,1,1,0,3]), unnest(ARRAY[5,15,15,10,10,5,10,10,10,10,10]), unnest(ARRAY['Maintenance','Maintenance','Maintenance','Inspection','Inspection','Testing','Maintenance','Maintenance','Inspection','Testing','Documentation'])
FROM sg_checklist_templates t WHERE t.name = 'HVAC Preventive Maintenance' AND t.is_system_template = true LIMIT 1;

-- Plumbing Fixture Installation items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Shut off water supply', 'Remove old fixture', 'Inspect supply lines and shutoffs', 'Apply plumber''s putty or gaskets', 'Install new fixture', 'Connect supply lines', 'Connect drain assembly', 'Test for leaks', 'Caulk around fixture', 'Clean and document installation']),
unnest(ARRAY['Turn off main or fixture shutoff valves', 'Carefully remove old fixture and clean area', 'Check condition and replace if needed', 'Seal fixture per manufacturer instructions', 'Position and secure fixture properly', 'Attach hot and cold supply lines', 'Install P-trap and connect to drain', 'Turn on water and inspect all connections', 'Apply silicone caulk around base and edges', 'Photo documentation before/after, test fixtures']),
generate_series(0, 9), unnest(ARRAY[0,1,1,0,2,1,1,0,0,2]), unnest(ARRAY[5,15,10,5,20,10,15,10,5,5]), unnest(ARRAY['Preparation','Removal','Inspection','Preparation','Installation','Installation','Installation','Testing','Finishing','Documentation'])
FROM sg_checklist_templates t WHERE t.name = 'Plumbing Fixture Installation' AND t.is_system_template = true LIMIT 1;

-- Electrical Outlet & Switch Installation items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Turn off power at breaker', 'Test for power with multimeter', 'Remove old device and cover plate', 'Inspect wire condition', 'Connect ground wire', 'Connect neutral (white) wire', 'Connect hot (black) wire', 'Secure device in box', 'Install cover plate', 'Restore power and test', 'Document installation']),
unnest(ARRAY['Switch off circuit breaker and label it', 'Verify no voltage present at outlet/switch', 'Carefully remove existing device', 'Check for damage, corrosion, or code issues', 'Connect ground to green screw', 'Connect neutral to silver screw', 'Connect hot wire to brass screw', 'Push device into box and tighten mounting screws', 'Attach decorative cover plate', 'Turn breaker on and test device operation', 'Photo documentation of connections and final install']),
generate_series(0, 10), unnest(ARRAY[0,0,1,1,1,1,1,0,0,0,2]), unnest(ARRAY[5,5,5,5,5,5,5,5,3,5,5]), unnest(ARRAY['Safety','Safety','Removal','Inspection','Installation','Installation','Installation','Installation','Finishing','Testing','Documentation'])
FROM sg_checklist_templates t WHERE t.name = 'Electrical Outlet & Switch Installation' AND t.is_system_template = true LIMIT 1;

-- Commercial Office Cleaning items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Empty all trash receptacles', 'Vacuum all carpeted areas', 'Mop hard floor surfaces', 'Clean and sanitize restrooms', 'Wipe down desks and surfaces', 'Clean glass doors and windows', 'Dust blinds and high surfaces', 'Clean and sanitize kitchen area', 'Restock supplies (paper, soap)', 'Final walkthrough and photos']),
unnest(ARRAY['Replace trash bags in all bins', 'Vacuum entire floor including under desks', 'Mop with appropriate cleaner, watch for wet floor signs', 'Toilet, sink, mirror cleaning and disinfection', 'Disinfect desks, phones, keyboards', 'Clean fingerprints and smudges from glass', 'Use duster or microfiber cloth on vents and blinds', 'Clean microwave, sink, counters, and refrigerator exterior', 'Refill paper towels, toilet paper, hand soap', 'Verify all areas meet quality standards, document']),
generate_series(0, 9), unnest(ARRAY[0,0,0,2,1,1,0,1,0,2]), unnest(ARRAY[10,20,15,20,15,10,10,15,5,10]), unnest(ARRAY['Trash','Floors','Floors','Restrooms','Surfaces','Glass','Dusting','Kitchen','Supplies','Completion'])
FROM sg_checklist_templates t WHERE t.name = 'Commercial Office Cleaning' AND t.is_system_template = true LIMIT 1;

-- Interior Painting items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Move and cover furniture', 'Repair holes and cracks', 'Sand surfaces smooth', 'Clean walls and remove dust', 'Apply painter''s tape', 'Prime walls if needed', 'Apply first coat of paint', 'Apply second coat of paint', 'Remove tape carefully', 'Touch up and inspect', 'Clean up and restore room']),
unnest(ARRAY['Protect furniture with drop cloths and plastic', 'Fill nail holes and repair damaged drywall', 'Sand patched areas and scuff existing paint', 'Wipe down walls to remove dust and debris', 'Tape off trim, ceiling, and adjacent walls', 'Apply primer to new drywall or dark colors', 'Apply first coat with roller and brush', 'Wait for first coat to dry, apply second coat', 'Remove tape while paint is slightly wet', 'Fix any imperfections or missed spots', 'Remove protection, clean brushes, restore furniture']),
generate_series(0, 10), unnest(ARRAY[1,1,0,0,0,1,2,2,0,1,1]), unnest(ARRAY[20,30,20,10,15,30,45,45,10,15,20]), unnest(ARRAY['Preparation','Preparation','Preparation','Preparation','Preparation','Priming','Painting','Painting','Finishing','Quality Check','Cleanup'])
FROM sg_checklist_templates t WHERE t.name = 'Interior Painting' AND t.is_system_template = true LIMIT 1;

-- Lawn Care & Maintenance items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Walk property and identify hazards', 'Mow lawn at proper height', 'Edge along sidewalks and driveways', 'Trim around obstacles', 'Blow off hard surfaces', 'Remove clippings if bagging', 'Apply fertilizer if scheduled', 'Water dry areas if needed', 'Inspect for pests or disease', 'Document completed work']),
unnest(ARRAY['Check for debris, rocks, or hazards before mowing', 'Cut grass to recommended height for grass type', 'Create clean edge along all hardscaping', 'Use string trimmer around trees, fences, beds', 'Blow clippings off sidewalks, driveways, patios', 'Collect and dispose of grass clippings', 'Spread fertilizer evenly per application rate', 'Apply water to stressed or dry lawn areas', 'Look for signs of grubs, fungus, or weeds', 'Take before/after photos of completed lawn']),
generate_series(0, 9), unnest(ARRAY[1,0,0,0,0,0,0,0,1,2]), unnest(ARRAY[5,30,15,15,10,10,15,10,10,5]), unnest(ARRAY['Safety','Mowing','Edging','Trimming','Cleanup','Cleanup','Treatment','Irrigation','Inspection','Documentation'])
FROM sg_checklist_templates t WHERE t.name = 'Lawn Care & Maintenance' AND t.is_system_template = true LIMIT 1;

-- Roof Inspection items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Set up ladder safely', 'Inspect shingles for damage', 'Check flashing around penetrations', 'Inspect valleys and ridges', 'Check gutters and downspouts', 'Examine attic for leaks', 'Inspect soffit and fascia', 'Check roof ventilation', 'Document all findings with photos', 'Prepare inspection report']),
unnest(ARRAY['Position ladder on stable ground with proper angle', 'Look for missing, cracked, or curling shingles', 'Verify flashing is sealed around chimneys, vents, skylights', 'Check for separation or damage in valley areas', 'Clear debris and check for proper drainage', 'Look for water stains, mold, or daylight through roof', 'Check for rot, damage, or pest entry points', 'Verify adequate attic ventilation for airflow', 'Photograph any damage, wear, or areas of concern', 'Compile findings with recommendations and cost estimates']),
generate_series(0, 9), unnest(ARRAY[0,3,2,2,2,2,1,1,5,0]), unnest(ARRAY[10,20,15,10,10,15,10,10,15,20]), unnest(ARRAY['Safety','Shingles','Flashing','Structure','Drainage','Interior','Exterior','Ventilation','Documentation','Reporting'])
FROM sg_checklist_templates t WHERE t.name = 'Roof Inspection' AND t.is_system_template = true LIMIT 1;

-- Pool Maintenance Service items
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, estimated_duration_minutes, category)
SELECT t.id, unnest(ARRAY['Test water chemistry', 'Skim surface debris', 'Brush walls and floor', 'Vacuum pool floor', 'Empty skimmer and pump baskets', 'Backwash filter if needed', 'Add chemicals as needed', 'Check equipment operation', 'Clean deck area', 'Document service visit']),
unnest(ARRAY['Test pH, chlorine, alkalinity with test kit', 'Remove leaves and debris from water surface', 'Brush walls, steps, and floor to prevent algae', 'Vacuum debris from pool floor', 'Clean out debris from skimmer and pump baskets', 'Backwash or clean filter based on pressure reading', 'Add chlorine, pH adjusters, or shock as needed', 'Verify pump, filter, heater are running properly', 'Blow off deck and remove any debris', 'Record readings and actions taken, photo documentation']),
generate_series(0, 9), unnest(ARRAY[0,0,0,0,1,1,1,1,0,2]), unnest(ARRAY[10,10,15,20,10,15,10,10,10,5]), unnest(ARRAY['Testing','Cleaning','Cleaning','Cleaning','Maintenance','Maintenance','Chemical','Equipment','Cleanup','Documentation'])
FROM sg_checklist_templates t WHERE t.name = 'Pool Maintenance Service' AND t.is_system_template = true LIMIT 1;