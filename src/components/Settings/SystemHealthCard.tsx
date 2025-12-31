import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Database, 
  Shield, 
  TestTube2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle 
} from 'lucide-react';
import type { HealthStatus, SystemType } from '@/lib/verification/types';

interface SystemHealthCardProps {
  system: SystemType;
  score: number;
  status: HealthStatus;
  checksPassed: number;
  checksFailed: number;
}

const systemConfig: Record<string, { icon: React.ElementType; label: string }> = {
  edge_function: { icon: Zap, label: 'Edge Functions' },
  database: { icon: Database, label: 'Database' },
  security: { icon: Shield, label: 'Security' },
  testing: { icon: TestTube2, label: 'Testing' },
  process: { icon: Zap, label: 'Processes' },
  component: { icon: Zap, label: 'Components' },
  hook: { icon: Zap, label: 'Hooks' },
};

const statusConfig: Record<HealthStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  healthy: { 
    icon: CheckCircle2, 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-500/10',
    label: 'Healthy' 
  },
  degraded: { 
    icon: AlertTriangle, 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-500/10',
    label: 'Degraded' 
  },
  unhealthy: { 
    icon: XCircle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    label: 'Unhealthy' 
  },
  unknown: { 
    icon: AlertTriangle, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted',
    label: 'Unknown' 
  },
};

export function SystemHealthCard({ 
  system, 
  score, 
  status, 
  checksPassed, 
  checksFailed 
}: SystemHealthCardProps) {
  const sysConfig = systemConfig[system] || { icon: Zap, label: system };
  const statConfig = statusConfig[status];
  const SystemIcon = sysConfig.icon;
  const StatusIcon = statConfig.icon;
  const totalChecks = checksPassed + checksFailed;

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-colors',
      statConfig.bgColor,
      'border-border/50'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <SystemIcon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">{sysConfig.label}</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn('text-xs', statConfig.color)}
        >
          <StatusIcon className="h-3 w-3 mr-1" />
          {statConfig.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={cn('text-2xl font-bold', statConfig.color)}>
            {score}%
          </span>
          <span className="text-xs text-muted-foreground">
            {checksPassed}/{totalChecks} checks
          </span>
        </div>
        
        <Progress 
          value={score} 
          className="h-2"
        />
      </div>
    </div>
  );
}
