import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, FileText, Receipt, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferenceCardProps {
  type: 'job' | 'quote' | 'invoice';
  title: string;
  status?: string;
  amount?: number;
  onClick?: () => void;
  compact?: boolean;
}

export function ReferenceCard({ type, title, status, amount, onClick, compact = false }: ReferenceCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'job': return <Briefcase className="h-4 w-4" />;
      case 'quote': return <FileText className="h-4 w-4" />;
      case 'invoice': return <Receipt className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'job': return 'Work Order';
      case 'quote': return 'Quote';
      case 'invoice': return 'Invoice';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'job': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'quote': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'invoice': return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
          getColor(),
          onClick && "hover:opacity-80 cursor-pointer"
        )}
      >
        {getIcon()}
        <span>{title}</span>
      </button>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 border-l-4 transition-colors",
        type === 'job' && "border-l-blue-500",
        type === 'quote' && "border-l-purple-500",
        type === 'invoice' && "border-l-green-500",
        onClick && "hover:bg-accent cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            type === 'job' && "bg-blue-500/10 text-blue-600",
            type === 'quote' && "bg-purple-500/10 text-purple-600",
            type === 'invoice' && "bg-green-500/10 text-green-600"
          )}>
            {getIcon()}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{getLabel()}</div>
            <div className="font-medium text-sm">{title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <Badge variant="outline" className="text-xs capitalize">
              {status}
            </Badge>
          )}
          {amount !== undefined && (
            <span className="text-sm font-medium">${amount.toLocaleString()}</span>
          )}
          {onClick && (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>
    </Card>
  );
}
