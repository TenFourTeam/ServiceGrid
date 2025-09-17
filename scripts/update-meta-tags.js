#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Default fallback values
const DEFAULT_BUSINESS = {
  name: "ServiceGrid",
  description: "Professional software for service businesses. Streamline scheduling, invoicing, and customer management."
};

async function getPrimaryBusiness() {
  try {
    console.log('[update-meta-tags] Fetching primary business data...');
    
    // Get the first business (assuming single-tenant for now)
    const { data: business, error } = await supabase
      .from('businesses')
      .select('name, description')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.warn('[update-meta-tags] Failed to fetch business:', error.message);
      return DEFAULT_BUSINESS;
    }

    if (!business) {
      console.log('[update-meta-tags] No business found, using defaults');
      return DEFAULT_BUSINESS;
    }

    console.log('[update-meta-tags] Business data retrieved:', business);
    
    return {
      name: business.name || DEFAULT_BUSINESS.name,
      description: business.description || DEFAULT_BUSINESS.description
    };
  } catch (error) {
    console.warn('[update-meta-tags] Error fetching business:', error);
    return DEFAULT_BUSINESS;
  }
}

function updateMetaTags() {
  try {
    const templatePath = join(__dirname, '../index.template.html');
    const outputPath = join(__dirname, '../index.html');
    
    console.log('[update-meta-tags] Reading template from:', templatePath);
    
    const template = readFileSync(templatePath, 'utf-8');
    
    return { template, outputPath };
  } catch (error) {
    console.error('[update-meta-tags] Error reading template:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('[update-meta-tags] Starting meta tag update process...');
  
  const business = await getPrimaryBusiness();
  const { template, outputPath } = updateMetaTags();
  
  // Create the final title and description
  const title = business.description 
    ? `${business.name} - ${business.description}`
    : `${business.name} - Professional Service Management`;
  const description = business.description || 'Professional service management software. Streamline scheduling, invoicing, and customer management.';
  
  console.log('[update-meta-tags] Replacing placeholders with:', { title, description });
  
  // Replace placeholders in template
  let html = template
    .replace(/\{\{BUSINESS_TITLE\}\}/g, title)
    .replace(/\{\{BUSINESS_DESCRIPTION\}\}/g, description)
    .replace(/\{\{BUSINESS_NAME\}\}/g, business.name);
  
  // Write the final HTML file
  writeFileSync(outputPath, html, 'utf-8');
  
  console.log('[update-meta-tags] Meta tags updated successfully in index.html');
  console.log('[update-meta-tags] Business:', business.name);
  console.log('[update-meta-tags] Description:', description);
}

main().catch((error) => {
  console.error('[update-meta-tags] Fatal error:', error);
  process.exit(1);
});