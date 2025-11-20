import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQuickBooksSyncSchedule } from '@/hooks/useQuickBooksSyncSchedule';
import type { QBSyncType, QBSyncDirection } from '@/types/quickbooks';
import { Clock } from 'lucide-react';

const ENTITY_TYPES: QBSyncType[] = ['customer', 'invoice', 'payment', 'time_entry'];
const FREQUENCIES = [
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 180, label: 'Every 3 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440, label: 'Daily' },
];

export function QuickBooksSyncSchedule() {
  const { schedules, updateSchedule, createSchedule, isUpdating } = useQuickBooksSyncSchedule();

  const getScheduleForType = (entityType: QBSyncType) => {
    return schedules.find(s => s.entity_type === entityType);
  };

  const handleToggle = (entityType: QBSyncType, enabled: boolean) => {
    const schedule = getScheduleForType(entityType);
    if (schedule) {
      updateSchedule({ id: schedule.id, enabled });
    } else if (enabled) {
      createSchedule({
        entity_type: entityType,
        enabled: true,
        frequency_minutes: 60,
        direction: 'bidirectional',
      });
    }
  };

  const handleFrequencyChange = (entityType: QBSyncType, frequency_minutes: number) => {
    const schedule = getScheduleForType(entityType);
    if (schedule) {
      updateSchedule({ id: schedule.id, frequency_minutes });
    }
  };

  const handleDirectionChange = (entityType: QBSyncType, direction: QBSyncDirection) => {
    const schedule = getScheduleForType(entityType);
    if (schedule) {
      updateSchedule({ id: schedule.id, direction });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Automatic Sync Schedule
        </CardTitle>
        <CardDescription>
          Configure automatic synchronization between ServiceGrid and QuickBooks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ENTITY_TYPES.map((entityType) => {
          const schedule = getScheduleForType(entityType);
          const isEnabled = schedule?.enabled || false;

          return (
            <div key={entityType} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium capitalize">{entityType}s</h4>
                  <p className="text-sm text-muted-foreground">
                    {isEnabled ? 'Auto-sync enabled' : 'Auto-sync disabled'}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(entityType, checked)}
                  disabled={isUpdating}
                />
              </div>

              {isEnabled && schedule && (
                <div className="grid gap-4 pt-2 border-t">
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={schedule.frequency_minutes.toString()}
                      onValueChange={(value) => handleFrequencyChange(entityType, parseInt(value))}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map(freq => (
                          <SelectItem key={freq.value} value={freq.value.toString()}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Direction</Label>
                    <Select
                      value={schedule.direction}
                      onValueChange={(value: QBSyncDirection) => handleDirectionChange(entityType, value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bidirectional">Bidirectional</SelectItem>
                        <SelectItem value="to_qb">ServiceGrid → QuickBooks</SelectItem>
                        <SelectItem value="from_qb">QuickBooks → ServiceGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {schedule.last_run_at && (
                    <p className="text-xs text-muted-foreground">
                      Last run: {new Date(schedule.last_run_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Automatic syncs run in the background. Manual syncs are always available in the Sync Controls tab.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
