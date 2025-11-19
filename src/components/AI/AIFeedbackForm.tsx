import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AIFeedbackFormProps {
  onSubmit: (feedback: { rating: number; text?: string }) => void;
  isSubmitting?: boolean;
}

export function AIFeedbackForm({ onSubmit, isSubmitting }: AIFeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({ rating, text: feedbackText || undefined });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <div>
        <p className="text-sm font-medium mb-2">Was this helpful?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  "w-6 h-6 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {rating > 0 && (
        <div className="space-y-2">
          <Textarea
            placeholder="Tell us more about your experience (optional)..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            size="sm"
          >
            Submit Feedback
          </Button>
        </div>
      )}
    </div>
  );
}
