import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import {
  validateAllProcesses,
  type ProcessValidationResult,
  type ValidationSummary,
  type ValidationCheck,
} from '@/lib/ai-agent/process-validator';

const CATEGORY_LABELS: Record<string, string> = {
  definition: 'Definition',
  contracts: 'Contracts',
  pattern: 'Pattern',
  automation: 'Automation',
  ui: 'UI',
  testing: 'Testing',
};

const CATEGORY_ORDER = ['definition', 'contracts', 'pattern', 'automation', 'ui', 'testing'];

interface ProcessCardProps {
  result: ProcessValidationResult;
}

function ProcessCard({ result }: ProcessCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const checksByCategory = useMemo(() => {
    const grouped: Record<string, ValidationCheck[]> = {};
    result.checks.forEach(check => {
      if (!grouped[check.category]) {
        grouped[check.category] = [];
      }
      grouped[check.category].push(check);
    });
    return grouped;
  }, [result.checks]);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
          <div className="flex items-center gap-3">
            {result.isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
            <div>
              <span className="font-medium text-sm">{result.processName}</span>
              <p className="text-xs text-muted-foreground">{result.processId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Progress value={result.score} className="w-16 h-2" />
              <span className="text-xs font-medium text-muted-foreground w-8">
                {result.score}%
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-2 pb-4 px-3">
        <div className="space-y-3">
          {CATEGORY_ORDER.map(category => {
            const checks = checksByCategory[category];
            if (!checks || checks.length === 0) return null;
            
            const passedCount = checks.filter(c => c.passed).length;
            const allPassed = passedCount === checks.length;
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <Badge variant={allPassed ? 'default' : 'secondary'} className="h-4 text-[10px]">
                    {passedCount}/{checks.length}
                  </Badge>
                </div>
                <div className="pl-2 space-y-1">
                  {checks.map(check => (
                    <div key={check.name} className="flex items-start gap-2 text-xs">
                      {check.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : check.required ? (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={check.passed ? 'text-muted-foreground' : ''}>
                          {check.name}
                        </span>
                        {check.details && (
                          <p className="text-muted-foreground truncate">{check.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ProcessVerificationPanel() {
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const runValidation = () => {
    setIsLoading(true);
    // Run validation (sync but wrapped for UX)
    setTimeout(() => {
      const result = validateAllProcesses();
      setSummary(result);
      setIsLoading(false);
    }, 100);
  };
  
  useEffect(() => {
    runValidation();
  }, []);
  
  const completeProcesses = summary?.results.filter(r => r.isComplete) || [];
  const incompleteProcesses = summary?.results.filter(r => !r.isComplete) || [];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Process Implementation Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runValidation}
            disabled={isLoading}
            className="h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Blueprint compliance for all AI Agent processes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{summary.totalProcesses}</p>
              <p className="text-xs text-muted-foreground">Total Processes</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.completeProcesses}</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-2xl font-bold text-primary">{summary.averageScore}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </div>
        )}
        
        {/* Incomplete Processes (show first) */}
        {incompleteProcesses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Needs Attention ({incompleteProcesses.length})
            </h4>
            <div className="space-y-2">
              {incompleteProcesses.map(result => (
                <ProcessCard key={result.processId} result={result} />
              ))}
            </div>
          </div>
        )}
        
        {/* Complete Processes */}
        {completeProcesses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Complete ({completeProcesses.length})
            </h4>
            <div className="space-y-2">
              {completeProcesses.map(result => (
                <ProcessCard key={result.processId} result={result} />
              ))}
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && !summary && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
