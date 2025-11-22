import { BeforeAfterPair } from '@/types/visualizations';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, Download, RefreshCw, Trash, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VisualizationCardProps {
  beforeAfterPair: BeforeAfterPair;
  onViewComparison: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onDownload?: () => void;
}

export function VisualizationCard({
  beforeAfterPair,
  onViewComparison,
  onRegenerate,
  onDelete,
  onDownload,
}: VisualizationCardProps) {
  const { beforePhoto, variations, prompt, createdAt } = beforeAfterPair;
  const firstVariation = variations[0];
  const style = firstVariation?.generation_metadata?.style || 'realistic';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Before & After</span>
                <Badge variant="secondary">
                  {variations.length} variation{variations.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 space-y-3">
              {/* Split view: Before | After */}
              <div className="grid grid-cols-2 gap-2">
                {/* Before Photo */}
                <div className="relative aspect-video rounded-md overflow-hidden border">
                  <img 
                    src={beforePhoto.thumbnail_url || beforePhoto.public_url} 
                    alt="Before"
                    className="w-full h-full object-cover" 
                  />
                  <Badge className="absolute bottom-2 left-2 text-xs bg-black/70 text-white">
                    Before
                  </Badge>
                </div>
                
                {/* First Variation */}
                <div className="relative aspect-video rounded-md overflow-hidden border">
                  <img 
                    src={firstVariation.thumbnail_url || firstVariation.public_url}
                    alt="After"
                    className="w-full h-full object-cover" 
                  />
                  <Badge className="absolute bottom-2 right-2 text-xs bg-primary/90 text-primary-foreground">
                    After
                  </Badge>
                </div>
              </div>
              
              {/* Prompt Preview */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {prompt}
              </p>
              
              {/* Metadata Row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {style.replace('_', ' ')}
                </Badge>
              </div>
              
              {/* Actions (visible on hover) */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewComparison();
                  }}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Compare
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onViewComparison}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Comparison
                    </DropdownMenuItem>
                    {onDownload && (
                      <DropdownMenuItem onClick={onDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download All
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={onRegenerate}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Prompt:</p>
            <p className="text-muted-foreground">{prompt}</p>
            <p className="font-semibold mt-2">Details:</p>
            <p className="text-muted-foreground">Style: {style}</p>
            <p className="text-muted-foreground">
              Model: {firstVariation?.generation_metadata?.model || 'Unknown'}
            </p>
            <p className="text-muted-foreground">
              Generated: {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
