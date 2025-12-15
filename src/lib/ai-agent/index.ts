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
