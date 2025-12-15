/**
 * ServiceGrid AI Agent Library
 * 
 * Complete AI agent system for intelligent automation of ServiceGrid operations.
 * Based on SIPOC process maps covering 12 core business domains.
 */

// Intent Classification
export {
  IntentClassifier,
  classifyIntent,
  getClassifier,
  needsClarification,
  generateClarificationQuestion,
  type ClassifierInput,
  type ClassifierConfig,
} from './intent-classifier';

// Intent Taxonomy
export {
  DOMAINS,
  DOMAIN_METADATA,
  INTENT_REGISTRY,
  getIntent,
  getIntentsByDomain,
  getDomainFromRoute,
  getHighRiskIntents,
  getConfirmationRequiredIntents,
  type Domain,
  type DomainMetadata,
  type IntentDefinition,
  type IntentCategory,
  type EntityType,
  type ExtractedEntity,
  type ClassifiedIntent,
} from './intent-taxonomy';

// Entity Extraction
export {
  extractEntities,
  validateRequiredEntities,
  getEntityValue,
  getAllEntityValues,
  type ExtractionResult,
} from './entity-extractor';

// Context Map
export {
  getDomain,
  getProcessStep,
  getRequiredContext,
  groupContextBySource,
  type DataSourceType,
  type ContextField,
  type ContextPriority,
  type ProcessStepContext,
  type DomainContext,
} from './context-map';

// Prompt Templates
export {
  PROMPT_TEMPLATES,
  getPromptTemplate,
  getTemplateForIntent,
  getTemplatesForDomain,
  getHighRiskTemplates,
  getRequiredContextKeys,
  getAllContextKeys,
  type PromptTemplate,
  type PromptTemplateRegistry,
} from './prompt-templates';

// Prompt Builder
export {
  buildPromptForIntent,
  buildPromptFromTemplateId,
  buildPromptFromTemplate,
  validateContext,
  getContextKeysForTemplate,
  previewPrompt,
  buildPromptsForWorkflow,
  mergeContext,
  type BuiltPrompt,
  type ContextData,
  type BuilderOptions,
} from './prompt-builder';

// Re-export for convenience
export { DOMAINS as AI_DOMAINS } from './intent-taxonomy';
export { PROMPT_TEMPLATES as AI_PROMPT_TEMPLATES } from './prompt-templates';
