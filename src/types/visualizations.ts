import { MediaItem } from '@/hooks/useJobMedia';

/**
 * Generation metadata stored in sg_media.generation_metadata
 */
export interface GenerationMetadata {
  is_ai_generated: true;
  generation_type: 'before_after_visualization';
  source_media_id: string;
  prompt: string;
  model: string;
  variation_number: number;
  total_variations: number;
  generation_id: string;
  style?: 'realistic' | 'architectural' | 'photo_realistic';
}

/**
 * Property visualization extends MediaItem with generation metadata
 */
export interface PropertyVisualization extends MediaItem {
  generation_metadata: GenerationMetadata;
}

/**
 * Before/After pair grouping
 */
export interface BeforeAfterPair {
  beforePhoto: MediaItem;
  variations: PropertyVisualization[];
  generationId: string;
  prompt: string;
  createdAt: string;
}

/**
 * Parameters for generating a visualization
 */
export interface GenerationParams {
  beforeMediaId: string;
  prompt: string;
  jobId?: string;
  style?: 'realistic' | 'architectural' | 'photo_realistic';
  numberOfVariations?: number;
}

/**
 * Result from generation edge function
 */
export interface GenerationResult {
  generationId: string;
  variations: Array<{
    mediaId: string;
    publicUrl: string;
    variationNumber: number;
  }>;
  confidence: 'high' | 'medium' | 'low';
  metadata: {
    model: string;
    tokensUsed?: number;
    latencyMs?: number;
  };
}
