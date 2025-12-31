/**
 * Alignment Health Card
 * 
 * Displays the DIY/DWY/DFY alignment status for all processes,
 * showing coverage percentages and misalignment warnings.
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GitBranch, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  User,
  Bot,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROCESS_FUNCTION_MAPPINGS } from '@/lib/verification/alignment/process-function-map';
import { ALL_PROCESS_IDS, ProcessId } from '@/lib/ai-agent/process-ids';

interface AutomationModeCoverage {
  mode: 'DIY' | 'DWY' | 'DFY';
  icon: React.ElementType;
  label: string;
  implemented: number;
  total: number;
}

export function AlignmentHealthCard() {
  // Calculate coverage for each automation mode
  const coverage: AutomationModeCoverage[] = [
    { mode: 'DIY', icon: User, label: 'Manual (DIY)', implemented: 0, total: 0 },
    { mode: 'DWY', icon: Bot, label: 'AI Assisted (DWY)', implemented: 0, total: 0 },
    { mode: 'DFY', icon: Sparkles, label: 'Automated (DFY)', implemented: 0, total: 0 },
  ];

  // Calculate process coverage
  const mappings = Object.values(PROCESS_FUNCTION_MAPPINGS);
  const processesWithMappings = new Set<ProcessId>();
  const misalignedProcesses: string[] = [];

  for (const mapping of mappings) {
    processesWithMappings.add(mapping.processId);
    
    for (const subStep of mapping.subSteps) {
      // DIY coverage
      coverage[0].total++;
      if (subStep.diy.edgeFunctions.length > 0 || 
          subStep.diy.uiComponents.length > 0) {
        coverage[0].implemented++;
      }
      
      // DWY coverage
      coverage[1].total++;
      if (subStep.dwy.tools.length > 0) {
        coverage[1].implemented++;
      }
      
      // DFY coverage
      coverage[2].total++;
      if (subStep.dfy.triggers.length > 0 || 
          subStep.dfy.scheduledJobs?.length) {
        coverage[2].implemented++;
      }
    }
  }

  // Check for missing process mappings
  for (const processId of ALL_PROCESS_IDS) {
    if (!processesWithMappings.has(processId)) {
      misalignedProcesses.push(processId);
    }
  }

  const processScore = Math.round((processesWithMappings.size / ALL_PROCESS_IDS.length) * 100);
  const overallScore = coverage.reduce((sum, c) => sum + (c.total > 0 ? c.implemented / c.total : 0), 0) / 3;
  const overallPercent = Math.round(overallScore * 100);
  
  const status = overallPercent >= 80 ? 'healthy' : overallPercent >= 60 ? 'degraded' : 'unhealthy';
  const StatusIcon = status === 'healthy' ? CheckCircle2 : status === 'degraded' ? AlertTriangle : XCircle;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Process Alignment</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              status === 'healthy' && 'text-green-600 border-green-600/30',
              status === 'degraded' && 'text-amber-600 border-amber-600/30',
              status === 'unhealthy' && 'text-destructive border-destructive/30'
            )}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {overallPercent}%
          </Badge>
        </div>
        <CardDescription>
          DIY/DWY/DFY implementation coverage across {processesWithMappings.size}/{ALL_PROCESS_IDS.length} processes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Process Coverage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Process Mapping Coverage</span>
            <span className="font-medium">{processesWithMappings.size}/{ALL_PROCESS_IDS.length}</span>
          </div>
          <Progress value={processScore} className="h-2" />
        </div>

        {/* Automation Mode Coverage */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {coverage.map((mode) => {
            const ModeIcon = mode.icon;
            const percent = mode.total > 0 ? Math.round((mode.implemented / mode.total) * 100) : 0;
            
            return (
              <div 
                key={mode.mode}
                className="text-center p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <ModeIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xs text-muted-foreground mb-1">{mode.label}</div>
                <div className="text-lg font-semibold">{percent}%</div>
                <div className="text-xs text-muted-foreground">
                  {mode.implemented}/{mode.total}
                </div>
              </div>
            );
          })}
        </div>

        {/* Misaligned Processes Warning */}
        {misalignedProcesses.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Missing Process Mappings</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {misalignedProcesses.map((pid) => (
                <Badge key={pid} variant="outline" className="text-xs">
                  {pid.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
