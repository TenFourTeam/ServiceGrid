import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuickBooksBulkSync } from '@/hooks/useQuickBooksBulkSync';
import { useState } from 'react';
import { Package, Play, X } from 'lucide-react';
import type { QBSyncType, QBSyncDirection } from '@/types/quickbooks';

// Mock data for demonstration
const MOCK_ENTITIES = {
  customer: [
    { id: '1', name: 'Acme Corp', email: 'contact@acme.com' },
    { id: '2', name: 'TechStart Inc', email: 'hello@techstart.com' },
    { id: '3', name: 'Global Services', email: 'info@global.com' },
  ],
  invoice: [
    { id: 'inv-1', number: 'INV-001', customer: 'Acme Corp', total: 15000 },
    { id: 'inv-2', number: 'INV-002', customer: 'TechStart Inc', total: 25000 },
  ],
  payment: [],
  time_entry: [],
};

export function QuickBooksBulkSync() {
  const { bulkSync, isLoading, progress } = useQuickBooksBulkSync();
  const [selectedType, setSelectedType] = useState<QBSyncType>('customer');
  const [selectedDirection, setSelectedDirection] = useState<QBSyncDirection>('to_qb');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const entities = MOCK_ENTITIES[selectedType];

  const handleToggleAll = () => {
    if (selectedIds.length === entities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entities.map(e => e.id));
    }
  };

  const handleToggleEntity = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSync = (dryRun: boolean = false) => {
    bulkSync({
      entityIds: selectedIds,
      entityType: selectedType,
      direction: selectedDirection,
      dryRun,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bulk Sync Operations
        </CardTitle>
        <CardDescription>
          Select multiple records to sync at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Entity Type</label>
            <Select value={selectedType} onValueChange={(v: QBSyncType) => {
              setSelectedType(v);
              setSelectedIds([]);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="time_entry">Time Entries</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Direction</label>
            <Select value={selectedDirection} onValueChange={(v: QBSyncDirection) => setSelectedDirection(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_qb">To QuickBooks</SelectItem>
                <SelectItem value="from_qb">From QuickBooks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Entity Selection */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.length === entities.length && entities.length > 0}
                onCheckedChange={handleToggleAll}
              />
              <span className="text-sm font-medium">
                Select All ({selectedIds.length}/{entities.length})
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="divide-y max-h-[300px] overflow-y-auto">
            {entities.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                No {selectedType}s available for sync
              </p>
            ) : (
              entities.map((entity: any) => (
                <div key={entity.id} className="flex items-center gap-2 p-3 hover:bg-muted/50">
                  <Checkbox
                    checked={selectedIds.includes(entity.id)}
                    onCheckedChange={() => handleToggleEntity(entity.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {entity.name || entity.number || entity.id}
                    </p>
                    {entity.email && (
                      <p className="text-xs text-muted-foreground">{entity.email}</p>
                    )}
                    {entity.customer && (
                      <p className="text-xs text-muted-foreground">{entity.customer}</p>
                    )}
                  </div>
                  {entity.total && (
                    <Badge variant="outline">${(entity.total / 100).toFixed(2)}</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Syncing...</span>
              <span>{progress.completed}/{progress.total}</span>
            </div>
            <Progress value={(progress.completed / progress.total) * 100} />
            {progress.errors.length > 0 && (
              <div className="text-xs text-red-600">
                {progress.errors.length} error(s) occurred
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            onClick={() => handleSync(true)}
            variant="outline"
            disabled={selectedIds.length === 0 || isLoading}
          >
            Preview Sync
          </Button>
          <Button
            onClick={() => handleSync(false)}
            disabled={selectedIds.length === 0 || isLoading}
          >
            <Play className="h-4 w-4 mr-2" />
            Sync {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
