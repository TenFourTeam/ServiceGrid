import { toast } from 'sonner';
import { PropertyVisualization } from '@/types/visualizations';

/**
 * Download a visualization image
 */
export async function downloadVisualization(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    
    toast.success('Image downloaded');
  } catch (error) {
    toast.error('Failed to download image');
    console.error('Download error:', error);
  }
}

/**
 * Download all variations (downloads each individually)
 */
export async function downloadAllVariations(variations: PropertyVisualization[]) {
  try {
    for (const variation of variations) {
      await downloadVisualization(
        variation.public_url,
        `visualization_v${variation.generation_metadata.variation_number}.png`
      );
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    toast.success(`Downloaded ${variations.length} variations`);
  } catch (error) {
    toast.error('Failed to download variations');
    console.error('Download error:', error);
  }
}

/**
 * Share visualization (copy link to clipboard)
 */
export function shareVisualization(url: string) {
  navigator.clipboard.writeText(url)
    .then(() => {
      toast.success('Link copied to clipboard!');
    })
    .catch(() => {
      toast.error('Failed to copy link');
    });
}
