-- Populate all system checklist templates with comprehensive task items

-- General Service Checklist
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('c922321d-a505-4374-8e44-931a1b3cd5c6', 'Document pre-service condition', 'Take photos of the property/area before starting work', 0, 2, 'Documentation'),
  ('c922321d-a505-4374-8e44-931a1b3cd5c6', 'Verify customer requirements', 'Review work order and confirm scope with customer', 1, 0, 'General'),
  ('c922321d-a505-4374-8e44-931a1b3cd5c6', 'Complete primary service tasks', 'Execute the main service work as outlined in work order', 2, 0, 'General'),
  ('c922321d-a505-4374-8e44-931a1b3cd5c6', 'Clean up work area', 'Remove debris and restore area to clean condition', 3, 1, 'General'),
  ('c922321d-a505-4374-8e44-931a1b3cd5c6', 'Document completed work', 'Take after photos showing completed work', 4, 2, 'Documentation'),
  ('c922321d-a505-4374-8e44-931a1b3cd5c6', 'Customer walkthrough and sign-off', 'Review work with customer and obtain approval', 5, 0, 'Completion');

-- Cabinet Installation
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Verify cabinet order and count pieces', 'Check all cabinet boxes match order and are undamaged', 0, 1, 'Documentation'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Inspect walls for studs', 'Locate and mark all wall studs for secure mounting', 1, 0, 'Preparation'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Install upper cabinets', 'Mount upper cabinets level and secure to studs', 2, 2, 'Installation'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Install base cabinets', 'Mount base cabinets level and secure to floor/walls', 3, 2, 'Installation'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Install drawer slides and doors', 'Attach all hardware and hang cabinet doors', 4, 1, 'Installation'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Check door alignment', 'Verify all doors align properly and close smoothly', 5, 0, 'Quality Control'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Install hardware', 'Attach handles, knobs, and other finishing hardware', 6, 1, 'Finishing'),
  ('54aeabdc-cf73-4925-bbcc-72220cde2c11', 'Final cleanup and walkthrough', 'Clean area and review installation with customer', 7, 2, 'Completion');

-- Residential Deep Cleaning
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Document pre-cleaning condition', 'Take photos of each room before starting', 0, 3, 'Documentation'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Dust all surfaces and ceiling fans', 'Dust all horizontal surfaces, fans, and vents', 1, 0, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Clean windows and mirrors', 'Wash and polish all glass surfaces', 2, 0, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Deep clean kitchen appliances', 'Clean inside/outside of oven, microwave, refrigerator', 3, 2, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Scrub bathrooms thoroughly', 'Deep clean toilet, shower, tub, sink, and fixtures', 4, 2, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Vacuum and mop all floors', 'Vacuum carpets and mop hard floors', 5, 0, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Clean baseboards and door frames', 'Wipe down all baseboards and door/window frames', 6, 0, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Empty trash and replace bags', 'Empty all trash cans and install fresh liners', 7, 0, 'Cleaning'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Final walkthrough inspection', 'Check all areas meet quality standards', 8, 0, 'Quality Control'),
  ('18a19043-a1aa-429d-a192-73af8d03974a', 'Take completion photos', 'Document cleaned rooms', 9, 3, 'Documentation');

-- Lawn Care & Maintenance
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Document lawn condition before service', 'Take overview photos of property', 0, 2, 'Documentation'),
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Mow lawn at proper height', 'Cut grass to recommended height for season', 1, 0, 'Mowing'),
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Edge all walkways and borders', 'Create clean edges along sidewalks, driveways, beds', 2, 0, 'Edging'),
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Trim around obstacles', 'String trim around trees, fences, and structures', 3, 0, 'Trimming'),
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Blow off hard surfaces', 'Clear all clippings from sidewalks, driveways, patios', 4, 0, 'Cleanup'),
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Inspect for lawn issues', 'Check for brown spots, weeds, disease, or pests', 5, 1, 'Inspection'),
  ('ea93926e-e660-4650-97e8-1f6e2b376da6', 'Take completion photos', 'Document finished lawn from multiple angles', 6, 2, 'Documentation');

-- HVAC System Installation
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Verify equipment and materials', 'Check all HVAC components match order', 0, 1, 'Documentation'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Remove old system (if applicable)', 'Disconnect and remove existing HVAC equipment', 1, 2, 'Removal'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Install outdoor condenser unit', 'Mount and level outdoor unit on pad', 2, 2, 'Installation'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Install indoor air handler/furnace', 'Mount indoor unit and connect to ductwork', 3, 2, 'Installation'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Run refrigerant lines', 'Install and insulate refrigerant line set', 4, 1, 'Installation'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Connect electrical and controls', 'Wire system and install thermostat', 5, 1, 'Electrical'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Vacuum and charge system', 'Evacuate lines and add proper refrigerant charge', 6, 0, 'Commissioning'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Test system operation', 'Run full heating and cooling cycles', 7, 0, 'Testing'),
  ('7543e98b-cd57-46af-b290-88a7636ac049', 'Document installation', 'Take photos of completed installation', 8, 3, 'Documentation');

-- Plumbing Leak Repair
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Document leak location and severity', 'Take photos showing leak and water damage', 0, 2, 'Documentation'),
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Shut off water supply', 'Turn off water to affected area', 1, 0, 'Preparation'),
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Drain remaining water', 'Open faucets and drain lines', 2, 0, 'Preparation'),
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Remove damaged section', 'Cut out and remove leaking pipe or fitting', 3, 1, 'Repair'),
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Install new pipe/fitting', 'Install replacement parts with proper fittings', 4, 1, 'Repair'),
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Test for leaks', 'Turn water on and inspect all connections', 5, 1, 'Testing'),
  ('e57b1baa-6c78-43c2-b43c-7c7f6c5dd1c5', 'Clean up and document repair', 'Clean work area and take completion photos', 6, 2, 'Completion');

-- Electrical Outlet Installation
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Turn off power at breaker', 'Verify power is off with voltage tester', 0, 0, 'Safety'),
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Document existing wiring', 'Take photo of current wiring configuration', 1, 1, 'Documentation'),
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Run electrical cable (if new)', 'Route cable from panel to outlet location', 2, 0, 'Installation'),
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Install outlet box', 'Mount electrical box securely to stud', 3, 1, 'Installation'),
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Connect wires to outlet', 'Attach hot, neutral, and ground wires properly', 4, 1, 'Installation'),
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Secure outlet and cover plate', 'Mount outlet in box and install cover', 5, 1, 'Installation'),
  ('be22c8c4-a209-440b-894b-ab19c3f4bace', 'Test outlet operation', 'Turn on power and test with voltage tester and load', 6, 1, 'Testing');

-- Roof Leak Repair
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Document leak and interior damage', 'Photo interior water damage and staining', 0, 2, 'Documentation'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Locate source on roof', 'Inspect roof to find exact leak source', 1, 2, 'Inspection'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Remove damaged shingles', 'Carefully remove affected roofing material', 2, 1, 'Repair'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Inspect and repair decking', 'Check and replace any damaged roof decking', 3, 1, 'Repair'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Install new underlayment', 'Add ice/water shield or felt paper', 4, 0, 'Repair'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Install new shingles', 'Replace shingles matching existing roof', 5, 2, 'Repair'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Seal and waterproof', 'Apply proper sealant around repair area', 6, 1, 'Repair'),
  ('e30cd918-bc2a-4533-96e5-7a3885704012', 'Document completed repair', 'Take final photos of repaired area', 7, 2, 'Documentation');

-- Interior Painting
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Document room condition before', 'Take photos of walls, trim, and ceiling', 0, 3, 'Documentation'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Protect floors and furniture', 'Lay drop cloths and cover furniture', 1, 0, 'Preparation'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Fill holes and imperfections', 'Patch nail holes and cracks with spackle', 2, 0, 'Preparation'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Sand and smooth surfaces', 'Sand patched areas and any rough spots', 3, 0, 'Preparation'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Tape edges and trim', 'Apply painter''s tape to protect trim and edges', 4, 0, 'Preparation'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Apply primer (if needed)', 'Prime bare patches or entire surface', 5, 0, 'Painting'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Apply first coat of paint', 'Paint ceiling, walls, then trim', 6, 1, 'Painting'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Apply second coat', 'Second coat for even coverage', 7, 1, 'Painting'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Remove tape and clean up', 'Carefully remove tape and clean area', 8, 0, 'Cleanup'),
  ('e7f10260-463e-4b04-9530-b3dcc9338770', 'Final inspection and photos', 'Document completed paint job', 9, 3, 'Completion');

-- Pest Control Inspection & Treatment
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Exterior perimeter inspection', 'Check for entry points and pest activity', 0, 2, 'Inspection'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Interior inspection', 'Check all rooms for signs of infestation', 1, 2, 'Inspection'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Identify pest species', 'Determine type of pest and level of infestation', 2, 1, 'Inspection'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Apply exterior perimeter treatment', 'Treat foundation and entry points', 3, 1, 'Treatment'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Apply interior treatment', 'Treat problem areas inside structure', 4, 1, 'Treatment'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Set monitoring stations/traps', 'Place bait stations or traps as needed', 5, 1, 'Treatment'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Provide customer recommendations', 'Advise on prevention and follow-up', 6, 0, 'Documentation'),
  ('94ddf68b-e34c-4bb2-9cb8-9f967a4eebd6', 'Document treatment and findings', 'Complete service report with photos', 7, 2, 'Documentation');

-- Pool Maintenance Service
INSERT INTO sg_checklist_template_items (template_id, title, description, position, required_photo_count, category)
VALUES 
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Test and record water chemistry', 'Test pH, chlorine, alkalinity, calcium hardness', 0, 1, 'Testing'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Skim surface debris', 'Remove leaves, bugs, and debris from surface', 1, 0, 'Cleaning'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Vacuum pool floor', 'Vacuum debris from pool bottom', 2, 0, 'Cleaning'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Brush walls and steps', 'Brush walls, steps, and ladders', 3, 0, 'Cleaning'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Clean skimmer and pump baskets', 'Empty and rinse skimmer and pump baskets', 4, 0, 'Equipment'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Backwash filter (if needed)', 'Backwash or clean filter system', 5, 0, 'Equipment'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Add chemicals to balance water', 'Add required chemicals based on test results', 6, 0, 'Chemical'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Inspect equipment operation', 'Check pump, filter, and heater operation', 7, 0, 'Inspection'),
  ('b22e68fd-4aee-4b6f-a4ea-fe9efb1a0fde', 'Document service completion', 'Record readings and take pool photos', 8, 2, 'Documentation');

-- Continue with remaining templates...