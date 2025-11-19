import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DraftChecklistBannerProps {
  onReview: () => void;
}

export function DraftChecklistBanner({ onReview }: DraftChecklistBannerProps) {
  return (
    <Alert variant="default" className="border-warning bg-warning/10">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">
          <strong>Draft Checklist:</strong> This AI-generated checklist needs review and approval before workers can see it.
        </span>
        <Button onClick={onReview} size="sm" variant="outline" className="ml-4">
          Review & Approve
        </Button>
      </AlertDescription>
    </Alert>
  );
}
