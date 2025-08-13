import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, X, SkipForward } from 'lucide-react';
import { cn } from '@/utils/cn';

interface HintCardProps {
  title: string;
  hint: string;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  canSkip?: boolean;
  className?: string;
}

export function HintCard({
  title,
  hint,
  onNext,
  onBack,
  onSkip,
  onClose,
  canSkip = false,
  className
}: HintCardProps) {
  return (
    <Card className={cn("w-80 max-w-[90vw] shadow-lg border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm mt-1">{hint}</CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
            {canSkip && onSkip && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Skip
              </Button>
            )}
          </div>
          
          {onNext && (
            <Button size="sm" onClick={onNext} className="ml-auto">
              Got it
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}