import { corsHeaders, requireCtx } from '../_lib/auth.ts';

// Industry slug to translation key mapping
const SLUG_TO_KEY_MAP: Record<string, string> = {
  'lawn-care': 'lawnCare',
  'house-cleaning': 'houseCleaning',
  'pressure-washing': 'pressureWashing',
  'irrigation': 'irrigation',
  'pool-service': 'poolService',
  'handyman': 'handyman',
  'gutter-cleaning': 'gutterCleaning',
  'junk-removal': 'junkRemoval',
  'carpet-cleaning': 'carpetCleaning'
};

// English translations for best practices (embedded for edge function)
const BEST_PRACTICES: Record<string, Array<{title: string, description: string}>> = {
  'lawnCare': [
    { title: 'Cluster by Geography, Not Chronology', description: 'Schedule all properties in the same neighborhood on the same day of the week. Drive time is unpaid time—grouping jobs geographically can add 1-2 billable hours per day.' },
    { title: 'Price for Density, Not Just Size', description: 'A quarter-acre lot surrounded by 10 other weekly customers is more valuable than an isolated half-acre property. Adjust pricing to reflect your route efficiency.' },
    { title: 'Preventive Maintenance Windows', description: 'Schedule equipment maintenance during slow weather periods. A broken mower on a sunny Wednesday costs you more than the repair itself—it costs you lost revenue.' },
    { title: 'Weather-Based Rescheduling Protocol', description: 'Build a clear wet-weather policy into your customer contracts. Know which services can proceed in light rain vs. must be postponed. Communicate changes proactively.' },
    { title: 'Standardized Service Definitions', description: 'Define exactly what "mow and edge" includes to prevent scope creep. Document your standard service details so new team members and customers know what to expect.' },
    { title: 'Seasonal Service Rotation', description: 'Transition from weekly mowing in peak season to bi-weekly in shoulder seasons. Offer leaf removal, aeration, or winterization services to maintain revenue year-round.' }
  ],
  'houseCleaning': [
    { title: 'Consistent Cleaning Checklist', description: 'Use the same detailed checklist for every clean. This ensures quality consistency, speeds up training, and gives customers confidence they\'re getting the same great service every time.' },
    { title: 'Zone-Based Routing', description: 'Schedule all clients in the same neighborhood on the same day. Reduce drive time, increase billable hours, and offer discounts for referrals in the same area.' },
    { title: 'Pre-Clean Customer Preparation', description: 'Educate customers on picking up clutter before your arrival. Your team should clean, not organize—this distinction protects your hourly rate and speeds up service.' },
    { title: 'Supply Cost Recovery', description: 'Track cleaning supply costs per clean and either include in pricing or charge separately. Many cleaners underestimate supply costs—tracking prevents margin erosion.' },
    { title: 'Quality Control Photo Documentation', description: 'Take after-photos of key areas like kitchens and bathrooms. Protects against disputes, showcases quality for marketing, and helps train new staff on standards.' },
    { title: 'Seasonal Deep Clean Upsells', description: 'Offer quarterly deep cleans (baseboards, inside appliances, windows) separate from regular maintenance cleans. This increases revenue and addresses tasks that accumulate over time.' }
  ],
  'pressureWashing': [
    { title: 'Pre-Job Site Assessment', description: 'Walk the property before quoting. Surface type, vegetation proximity, and access affect time and pricing. Upsell additional surfaces (fence, driveway, deck) discovered during walk-through.' },
    { title: 'Water Source Planning', description: 'Confirm water access before arrival. Bring your own water tank for properties without exterior hookups—charge a premium for this service.' },
    { title: 'Seasonal Demand Management', description: 'Pressure washing is seasonal in many markets. Offer winter roof cleaning, gutter clearing, or holiday light installation to maintain cash flow during slow months.' },
    { title: 'Chemical Application Documentation', description: 'Log chemicals used for each job type. Helps with re-ordering, ensures consistency, and protects you if customers have questions about treatments used.' },
    { title: 'Before/After Photo Marketing', description: 'Pressure washing creates dramatic visual transformations. Capture before/after shots for every job—this content converts prospects better than any ad copy.' },
    { title: 'Equipment Maintenance Schedule', description: 'Pressure washers are hard on equipment. Schedule regular maintenance (pump oil, nozzle replacement, hose inspection) to prevent costly breakdowns during peak season.' }
  ],
  'irrigation': [
    { title: 'Seasonal System Activation Protocol', description: 'Develop a checklist for spring startups and fall winterizations. These seasonal transitions are revenue peaks—systematize them for efficiency and consistency.' },
    { title: 'Water Efficiency Audits', description: 'Offer annual irrigation audits to identify leaks, optimize zones, and reduce customer water bills. Position yourself as a water conservation partner, not just a repair service.' },
    { title: 'Smart Controller Upgrades', description: 'Upsell smart irrigation controllers that adjust watering based on weather. One-time installation creates recurring service contracts and differentiates you from competitors.' },
    { title: 'Zone Documentation System', description: 'Map and document every zone for each property. Speeds up future repairs, justifies your expertise vs. handymen, and provides value customers can\'t easily replace.' },
    { title: 'Preventive Maintenance Packages', description: 'Offer quarterly system checks that catch small issues before they become emergency repairs. Recurring revenue and reduces after-hours emergency calls.' },
    { title: 'Cross-Sell Landscape Lighting', description: 'Irrigation and low-voltage lighting install similarly. Learn landscape lighting to expand services and increase revenue per customer.' }
  ],
  'poolService': [
    { title: 'Chemical Inventory Management', description: 'Track chemical usage per pool to identify abnormal consumption (indicating leaks or equipment issues). Bulk buy during off-season when prices are lower.' },
    { title: 'Automated Chemical Dispensing', description: 'Recommend automated chlorinators and pH controllers to customers. Reduces your weekly chemical handling time and ensures consistent water chemistry between visits.' },
    { title: 'Route Density Pricing', description: 'Charge less for pools clustered in the same neighborhood and more for isolated stops. Reward customers who help you build density through referrals.' },
    { title: 'Equipment Upgrade Programs', description: 'Offer pump, heater, and filter upgrades. One equipment sale equals 20-30 weeks of service revenue. Position energy-efficient models that reduce customer utility costs.' },
    { title: 'Winter Service Retention', description: 'In seasonal markets, offer winterization and monthly freeze-protection checks to maintain customer relationships year-round. Customers often switch providers over winter breaks.' },
    { title: 'Water Chemistry Documentation', description: 'Log all readings and treatments digitally. Protects against liability claims and helps diagnose recurring issues caused by external factors (source water, bather load).' }
  ],
  'handyman': [
    { title: 'Build a Service Catalog', description: 'Create standardized pricing for your 20-30 most common tasks. Track actual time per task for 2-3 months to refine pricing. Move from hourly to flat-rate pricing on tasks you\'ve mastered.' },
    { title: 'Photograph Everything', description: 'Take before photos when you arrive and after photos when complete. Photograph any additional issues you discover. Photos prevent disputes, help with upselling, and showcase your quality.' },
    { title: 'Use Change Orders Religiously', description: 'When customers request additional work beyond the original scope, stop, document it, price it, and get approval before proceeding. This single habit can increase revenue 15-25%.' },
    { title: 'Organize Your Truck Strategically', description: 'Use bins labeled by category (electrical, plumbing, fasteners, etc.). Keep your top 10 tools in a quick-access bag. Stock common parts so you can complete jobs in one visit. Time saved is money earned.' },
    { title: 'Track Time Per Task Type', description: 'Log actual time for each service category for 60-90 days. Identify which services are most profitable per hour. Focus marketing on high-profit services and consider dropping low-profit work.' },
    { title: 'Build a Licensed Contractor Network', description: 'Develop relationships with licensed electricians, plumbers, and HVAC techs. Refer work that exceeds your license and ask for reciprocal referrals. Some handymen earn 10-20% referral fees for project management.' }
  ],
  'gutterCleaning': [
    { title: 'Seasonal Schedule Optimization', description: 'Schedule gutter cleaning in late fall (after leaves drop) and spring. Block out entire neighborhoods on the same day to minimize drive time between jobs.' },
    { title: 'Downspout Flow Testing', description: 'After cleaning, flush every downspout with a hose. Catches clogs you might miss and demonstrates thoroughness to customers. Prevents callbacks for "gutters still overflowing."' },
    { title: 'Gutter Guard Upsells', description: 'Offer gutter guard installation as a premium service. One installation can equal 3-5 years of cleaning revenue upfront, and creates opportunity for annual inspection contracts.' },
    { title: 'Roof Inspection Add-On', description: 'While on the roof, offer basic roof inspections (missing shingles, flashing issues). Doesn\'t require licensing in most states and provides value customers didn\'t expect.' },
    { title: 'Before/After Debris Photos', description: 'Photograph the debris you remove. Customers rarely see the work you do—showing them piles of leaves and sludge justifies your pricing and generates referrals.' },
    { title: 'Weather-Based Scheduling', description: 'Check forecast before scheduling. Wet leaves are heavier and slower to remove. Schedule dry-weather routes to maximize productivity and safety.' }
  ],
  'junkRemoval': [
    { title: 'Volume-Based Pricing Tiers', description: 'Price by truck volume (quarter, half, full truck) instead of hourly. Easier for customers to understand and faster for you to quote. Rewards your efficiency.' },
    { title: 'Donation and Recycling Partnerships', description: 'Partner with donation centers and recycling facilities. Reduces landfill fees and appeals to environmentally conscious customers willing to pay premium rates.' },
    { title: 'Pre-Job Photo Documentation', description: 'Photograph items before loading. Protects against damage claims ("you broke this when you moved it") and helps with accurate pre-job estimates for future similar jobs.' },
    { title: 'Heavy Item Surcharges', description: 'Charge extra for appliances, concrete, dirt, and other heavy materials. These items require more labor, time, and dump fees—don\'t let them erode margins on volume-based pricing.' },
    { title: 'Same-Day Service Premium', description: 'Charge 20-30% more for same-day service. Customers with urgent needs (moving, estate sales, code violations) will pay—and it allows you to optimize next-day route planning.' },
    { title: 'Recurring Cleanout Contracts', description: 'Offer quarterly or annual cleanouts for property managers, storage facilities, and rental property owners. Recurring contracts smooth revenue and reduce marketing costs.' }
  ],
  'carpetCleaning': [
    { title: 'Pre-Treatment for High-Traffic Areas', description: 'Always pre-treat high-traffic areas and pet accident zones. Delivers better results, justifies your pricing vs. DIY rental machines, and reduces callbacks for spots that "came back."' },
    { title: 'Drying Time Communication', description: 'Set clear expectations for drying time (6-12 hours typically). Provide fans or air movers to speed drying. Fast drying reduces mold risk and improves customer satisfaction.' },
    { title: 'Furniture Moving Protocols', description: 'Decide what furniture you\'ll move (light items) vs. what customer must clear (electronics, fragile items). Document this in your service agreement to prevent disputes.' },
    { title: 'Carpet Protection Upsells', description: 'Offer scotchguard or other protectant treatments after cleaning. High margin, easy application, and extends time between cleanings—customers appreciate the value.' },
    { title: 'Multi-Room Discount Strategy', description: 'Offer per-room pricing with discounts for multiple rooms. Reduces setup time per dollar earned and increases average job value. Example: $50/room, or 5 rooms for $200.' },
    { title: 'Annual Maintenance Reminders', description: 'Track when each property was last cleaned and send annual reminders. Carpets should be cleaned 1-2 times per year—automated reminders convert to repeat business.' }
  ]
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[populate-industry-sops] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const businessId = ctx.businessId;
    const userId = ctx.userId;

    // Only business owners can populate SOPs
    const canManage = await ctx.can_manage_business();
    if (!canManage) {
      throw new Error('Only business owners can populate SOPs');
    }

    const { industry } = await req.json();
    
    if (!industry || typeof industry !== 'string') {
      throw new Error('Industry slug is required');
    }

    // Validate industry slug
    const industryKey = SLUG_TO_KEY_MAP[industry];
    if (!industryKey) {
      throw new Error(`Invalid industry slug: ${industry}. Valid options: ${Object.keys(SLUG_TO_KEY_MAP).join(', ')}`);
    }

    console.log(`[populate-industry-sops] Populating SOPs for industry: ${industry} (${industryKey})`);

    // Get best practices for this industry
    const bestPractices = BEST_PRACTICES[industryKey] || [];
    
    if (bestPractices.length === 0) {
      throw new Error(`No best practices found for industry: ${industry}`);
    }

    console.log(`[populate-industry-sops] Found ${bestPractices.length} best practices`);

    // Check for existing SOPs to prevent duplicates
    const { data: existingServices, error: fetchError } = await supabase
      .from('service_catalog')
      .select('service_name')
      .eq('business_id', businessId)
      .eq('category', 'SOP');

    if (fetchError) {
      console.error('[populate-industry-sops] Error fetching existing services:', fetchError);
      throw fetchError;
    }

    const existingNames = new Set(existingServices?.map(s => s.service_name) || []);
    console.log(`[populate-industry-sops] Found ${existingNames.size} existing SOPs`);

    // Filter out duplicates
    const newPractices = bestPractices.filter(bp => !existingNames.has(bp.title));
    console.log(`[populate-industry-sops] ${newPractices.length} new SOPs to add`);

    let servicesCreated = 0;

    if (newPractices.length > 0) {
      // Create service catalog entries
      const serviceCatalogEntries = newPractices.map(bp => ({
        business_id: businessId,
        service_name: bp.title,
        description: bp.description,
        unit_price: 0, // User will set pricing
        unit_type: 'service',
        category: 'SOP',
        is_active: true
      }));

      const { error: insertError } = await supabase
        .from('service_catalog')
        .insert(serviceCatalogEntries);

      if (insertError) {
        console.error('[populate-industry-sops] Error inserting services:', insertError);
        throw insertError;
      }

      servicesCreated = newPractices.length;
    }

    // Update business industry field
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ industry })
      .eq('id', businessId);

    if (updateError) {
      console.error('[populate-industry-sops] Error updating business industry:', updateError);
      throw updateError;
    }

    console.log(`[populate-industry-sops] Successfully created ${servicesCreated} SOPs and updated business industry`);

    return new Response(JSON.stringify({ 
      success: true, 
      servicesCreated,
      totalPractices: bestPractices.length,
      skipped: bestPractices.length - servicesCreated,
      message: servicesCreated > 0 
        ? `Added ${servicesCreated} industry best practices to your Service Catalog`
        : 'All best practices already exist in your catalog'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[populate-industry-sops] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: error.message.includes('Only business owners') ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
