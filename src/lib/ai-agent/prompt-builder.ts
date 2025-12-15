/**
 * ServiceGrid AI Agent - Prompt Builder
 * 
 * Builds dynamic prompts by combining templates with loaded context data.
 * Handles variable substitution, array iteration, and conditional sections.
 */

import type { ClassifiedIntent } from './intent-taxonomy';
import type { PromptTemplate } from './prompt-templates';
import { getTemplateForIntent, getPromptTemplate } from './prompt-templates';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface BuiltPrompt {
  systemPrompt: string;
  tools: string[];
  templateId: string;
  requiredContext: string[];
  missingContext: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}

export interface ContextData {
  [key: string]: any;
}

export interface BuilderOptions {
  includeOptionalContext?: boolean;
  strictMode?: boolean; // Fail if required context is missing
  maxArrayItems?: number; // Limit for array iterations
}

const DEFAULT_OPTIONS: BuilderOptions = {
  includeOptionalContext: true,
  strictMode: false,
  maxArrayItems: 50,
};

// =============================================================================
// TEMPLATE VARIABLE SUBSTITUTION
// =============================================================================

/**
 * Simple template engine supporting:
 * - {{variable}} - Simple substitution
 * - {{#each array}}...{{/each}} - Array iteration
 * - {{#if condition}}...{{/if}} - Conditional sections
 */
function processTemplate(template: string, context: ContextData, options: BuilderOptions): string {
  let result = template;
  
  // Process {{#each}} blocks first
  result = processEachBlocks(result, context, options);
  
  // Process {{#if}} blocks
  result = processIfBlocks(result, context);
  
  // Process simple {{variable}} substitutions
  result = processVariables(result, context);
  
  // Clean up any remaining unprocessed placeholders
  result = cleanupPlaceholders(result);
  
  return result;
}

/**
 * Process {{#each array}}...{{/each}} blocks
 */
function processEachBlocks(template: string, context: ContextData, options: BuilderOptions): string {
  const eachRegex = /\{{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  
  return template.replace(eachRegex, (match, arrayName, innerTemplate) => {
    const array = context[arrayName];
    
    if (!Array.isArray(array) || array.length === 0) {
      return `[No ${arrayName} available]`;
    }
    
    // Limit array items to prevent huge prompts
    const limitedArray = array.slice(0, options.maxArrayItems || 50);
    
    return limitedArray.map((item, index) => {
      // Create a context that includes the item's properties directly
      const itemContext = { 
        ...context,
        ...item,
        index: index + 1,
        isFirst: index === 0,
        isLast: index === limitedArray.length - 1,
      };
      
      // Process nested templates
      let processed = innerTemplate;
      processed = processIfBlocks(processed, itemContext);
      processed = processVariables(processed, itemContext);
      
      return processed;
    }).join('\n');
  });
}

/**
 * Process {{#if condition}}...{{/if}} blocks
 */
function processIfBlocks(template: string, context: ContextData): string {
  const ifRegex = /\{{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  return template.replace(ifRegex, (match, conditionName, innerContent) => {
    const conditionValue = context[conditionName];
    
    // Truthy check
    if (conditionValue && conditionValue !== 'false' && conditionValue !== '0') {
      return processVariables(innerContent, context);
    }
    
    return '';
  });
}

/**
 * Process simple {{variable}} substitutions
 */
function processVariables(template: string, context: ContextData): string {
  const variableRegex = /\{{(\w+(?:\.\w+)*)\}\}/g;
  
  return template.replace(variableRegex, (match, path) => {
    const value = getNestedValue(context, path);
    
    if (value === undefined || value === null) {
      return `[${path}]`; // Placeholder for missing values
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  });
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Clean up any remaining unprocessed placeholders
 */
function cleanupPlaceholders(template: string): string {
  // Remove empty lines that only contain whitespace
  const lines = template.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    // Keep the line unless it only contains a placeholder
    return !(/^\[[\w.]+\]$/.test(trimmed) && trimmed.length > 2);
  });
  
  return cleanedLines.join('\n');
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build a complete prompt from a classified intent and loaded context
 */
export function buildPromptForIntent(
  classifiedIntent: ClassifiedIntent,
  context: ContextData,
  options: Partial<BuilderOptions> = {}
): BuiltPrompt {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get the template for this intent
  const template = getTemplateForIntent(classifiedIntent.domain, classifiedIntent.intent);
  
  if (!template) {
    throw new Error(`No template found for intent: ${classifiedIntent.domain}.${classifiedIntent.intent}`);
  }
  
  return buildPromptFromTemplate(template, context, opts);
}

/**
 * Build a prompt from a specific template ID
 */
export function buildPromptFromTemplateId(
  templateId: string,
  context: ContextData,
  options: Partial<BuilderOptions> = {}
): BuiltPrompt {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const template = getPromptTemplate(templateId);
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  return buildPromptFromTemplate(template, context, opts);
}

/**
 * Build a prompt from a template object
 */
export function buildPromptFromTemplate(
  template: PromptTemplate,
  context: ContextData,
  options: BuilderOptions = DEFAULT_OPTIONS
): BuiltPrompt {
  // Check for missing required context
  const missingContext = template.requiredContext.filter(key => {
    const value = context[key];
    return value === undefined || value === null;
  });
  
  if (options.strictMode && missingContext.length > 0) {
    throw new Error(`Missing required context: ${missingContext.join(', ')}`);
  }
  
  // Build each section of the prompt
  const roleSection = processTemplate(template.template.role, context, options);
  const contextSection = processTemplate(template.template.context, context, options);
  const taskSection = processTemplate(template.template.task, context, options);
  const constraintsSection = processTemplate(template.template.constraints, context, options);
  const outputSection = processTemplate(template.template.outputFormat, context, options);
  
  // Assemble the full system prompt
  const systemPrompt = assemblePrompt({
    role: roleSection,
    context: contextSection,
    task: taskSection,
    constraints: constraintsSection,
    outputFormat: outputSection,
  });
  
  return {
    systemPrompt,
    tools: template.tools,
    templateId: template.id,
    requiredContext: template.requiredContext,
    missingContext,
    riskLevel: template.riskLevel,
    requiresConfirmation: template.requiresConfirmation,
  };
}

/**
 * Assemble the final prompt from sections
 */
function assemblePrompt(sections: {
  role: string;
  context: string;
  task: string;
  constraints: string;
  outputFormat: string;
}): string {
  const parts: string[] = [];
  
  // Role section
  if (sections.role.trim()) {
    parts.push(sections.role.trim());
  }
  
  // Context section
  if (sections.context.trim()) {
    parts.push(`
--- CURRENT CONTEXT ---
${sections.context.trim()}`);
  }
  
  // Task section
  if (sections.task.trim()) {
    parts.push(`
--- YOUR TASK ---
${sections.task.trim()}`);
  }
  
  // Constraints section
  if (sections.constraints.trim()) {
    parts.push(`
--- CONSTRAINTS ---
${sections.constraints.trim()}`);
  }
  
  // Output format section
  if (sections.outputFormat.trim()) {
    parts.push(`
--- EXPECTED OUTPUT ---
${sections.outputFormat.trim()}`);
  }
  
  return parts.join('\n');
}

// =============================================================================
// CONTEXT VALIDATION
// =============================================================================

/**
 * Check if all required context is available for a template
 */
export function validateContext(
  templateId: string,
  context: ContextData
): { valid: boolean; missing: string[] } {
  const template = getPromptTemplate(templateId);
  
  if (!template) {
    return { valid: false, missing: ['TEMPLATE_NOT_FOUND'] };
  }
  
  const missing = template.requiredContext.filter(key => {
    const value = context[key];
    return value === undefined || value === null;
  });
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get a list of all context keys needed for a template
 */
export function getContextKeysForTemplate(
  templateId: string,
  includeOptional: boolean = false
): string[] {
  const template = getPromptTemplate(templateId);
  
  if (!template) {
    return [];
  }
  
  if (includeOptional) {
    return [...template.requiredContext, ...template.optionalContext];
  }
  
  return [...template.requiredContext];
}

// =============================================================================
// PROMPT PREVIEW (FOR DEBUGGING)
// =============================================================================

/**
 * Generate a preview of what the prompt would look like with placeholder values
 */
export function previewPrompt(templateId: string): string {
  const template = getPromptTemplate(templateId);
  
  if (!template) {
    return `Template not found: ${templateId}`;
  }
  
  // Create mock context with placeholder values
  const mockContext: ContextData = {};
  
  [...template.requiredContext, ...template.optionalContext].forEach(key => {
    mockContext[key] = `[${key}]`;
  });
  
  try {
    const built = buildPromptFromTemplate(template, mockContext, {
      strictMode: false,
      includeOptionalContext: true,
    });
    
    return `
=== PROMPT PREVIEW: ${template.name} ===
ID: ${template.id}
Domain: ${template.domain}
Risk Level: ${template.riskLevel}
Requires Confirmation: ${template.requiresConfirmation}

=== REQUIRED CONTEXT ===
${template.requiredContext.join(', ')}

=== OPTIONAL CONTEXT ===
${template.optionalContext.join(', ')}

=== AVAILABLE TOOLS ===
${template.tools.join(', ')}

=== SYSTEM PROMPT ===
${built.systemPrompt}
`;
  } catch (error) {
    return `Error building preview: ${error}`;
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Build prompts for multiple intents (useful for multi-step workflows)
 */
export function buildPromptsForWorkflow(
  intents: ClassifiedIntent[],
  context: ContextData,
  options: Partial<BuilderOptions> = {}
): BuiltPrompt[] {
  return intents.map(intent => buildPromptForIntent(intent, context, options));
}

/**
 * Merge context from multiple sources
 */
export function mergeContext(...contexts: ContextData[]): ContextData {
  return contexts.reduce((merged, ctx) => ({ ...merged, ...ctx }), {});
}
