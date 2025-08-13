import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  icon?: ReactNode;
  badge?: string;
}

interface AdvancedEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actions: EmptyStateAction[];
  secondaryActions?: EmptyStateAction[];
  className?: string;
}

export function AdvancedEmptyState({
  icon,
  title,
  description,
  actions,
  secondaryActions,
  className = ''
}: AdvancedEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          {icon}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>

        {/* Primary Actions */}
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="flex flex-col items-center">
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                className="min-w-[200px] group relative"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              {action.badge && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {action.badge}
                </Badge>
              )}
              {action.description && (
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  {action.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Secondary Actions */}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Or try these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {secondaryActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}