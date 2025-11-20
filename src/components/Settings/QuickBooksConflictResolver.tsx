import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuickBooksConflicts } from '@/hooks/useQuickBooksConflicts';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export function QuickBooksConflictResolver() {
  const { unresolvedConflicts, resolveConflict, isResolving } = useQuickBooksConflicts();
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);

  if (unresolvedConflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Conflicts</CardTitle>
          <CardDescription>No conflicts to resolve</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All records are in sync. Conflicts appear here when the same record is modified in both ServiceGrid and QuickBooks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Sync Conflicts ({unresolvedConflicts.length})
        </CardTitle>
        <CardDescription>
          Resolve conflicts when records differ between ServiceGrid and QuickBooks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unresolvedConflicts.map((conflict) => {
          const isExpanded = expandedConflict === conflict.id;

          return (
            <div key={conflict.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{conflict.entity_type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {isExpanded && (
                <div className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* ServiceGrid Data */}
                    <div className="border rounded p-3">
                      <h4 className="font-medium mb-2 text-sm">ServiceGrid Data</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                        {JSON.stringify(conflict.sg_data, null, 2)}
                      </pre>
                    </div>

                    {/* QuickBooks Data */}
                    <div className="border rounded p-3">
                      <h4 className="font-medium mb-2 text-sm">QuickBooks Data</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                        {JSON.stringify(conflict.qb_data, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Resolution Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveConflict({ 
                        conflictId: conflict.id, 
                        resolution: 'sg',
                        resolvedData: conflict.sg_data
                      })}
                      disabled={isResolving}
                    >
                      Keep ServiceGrid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveConflict({ 
                        conflictId: conflict.id, 
                        resolution: 'qb',
                        resolvedData: conflict.qb_data
                      })}
                      disabled={isResolving}
                    >
                      Keep QuickBooks
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Merge logic - simple example, could be more sophisticated
                        const merged = { ...conflict.qb_data, ...conflict.sg_data };
                        resolveConflict({ 
                          conflictId: conflict.id, 
                          resolution: 'merged',
                          resolvedData: merged
                        });
                      }}
                      disabled={isResolving}
                    >
                      Merge (Keep Latest)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
