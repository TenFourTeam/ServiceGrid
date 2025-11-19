import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronUp, MessageSquare, Edit, Trash2, Check } from 'lucide-react';
import { RoadmapFeature } from '@/hooks/useRoadmapFeatures';
import { useVote, useUnvote, useVoteStatus } from '@/hooks/useRoadmapVotes';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { EditFeatureDialog } from './EditFeatureDialog';

interface RoadmapFeatureCardProps {
  feature: RoadmapFeature;
}

const statusConfig = {
  'under-consideration': { label: 'Under Consideration', variant: 'secondary' as const },
  'planned': { label: 'Planned', variant: 'default' as const },
  'in-progress': { label: 'In Progress', variant: 'default' as const },
  'shipped': { label: 'Shipped', variant: 'default' as const },
  'unlikely': { label: 'Unlikely', variant: 'destructive' as const },
};

export function RoadmapFeatureCard({ feature }: RoadmapFeatureCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: voteStatus } = useVoteStatus(feature.id);
  const vote = useVote();
  const unvote = useUnvote();

  const hasVoted = voteStatus?.hasVoted || false;
  const statusInfo = statusConfig[feature.status];

  const handleVoteClick = () => {
    if (hasVoted) {
      unvote.mutate(feature.id);
    } else {
      vote.mutate(feature.id);
    }
  };

  return (
    <>
      <Card
        className="group hover:shadow-md transition-shadow"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <CardContent className="pt-6">
          <div className="flex gap-4">
            {/* Vote button */}
            <button
              onClick={handleVoteClick}
              disabled={vote.isPending || unvote.isPending}
              className={cn(
                'flex flex-col items-center justify-center min-w-[48px] h-16 rounded-md border transition-all',
                hasVoted
                  ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {hasVoted ? (
                <Check className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
              <span className="text-xs font-medium mt-1">{feature.vote_count}</span>
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg leading-tight">{feature.title}</h3>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {feature.description}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {feature.comment_count} comments
            </span>
            <span>{formatDistanceToNow(new Date(feature.created_at), { addSuffix: true })}</span>
          </div>

          {/* Action buttons (visible on hover) */}
          <div
            className={cn(
              'flex items-center gap-2 transition-opacity',
              showActions ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="h-8"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <EditFeatureDialog
        feature={feature}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
