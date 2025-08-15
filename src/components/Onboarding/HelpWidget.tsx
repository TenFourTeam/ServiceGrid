import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

interface HelpWidgetProps {
  onOpenHelp: () => void;
}

export function HelpWidget({ onOpenHelp }: HelpWidgetProps) {
  const location = useLocation();
  
  // Hide widget on landing page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button
        onClick={onOpenHelp}
        size="lg"
        className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        title="Get help with next steps"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}