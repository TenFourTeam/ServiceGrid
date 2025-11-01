import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useTeamAvailability, useCreateAvailability, useUpdateAvailability, useDeleteAvailability } from '@/hooks/useTeamAvailability';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/queries/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function TeamAvailabilitySchedule() {
  const { businessId } = useBusinessContext();
  const { data: profile } = useProfile();
  const userId = profile?.profile?.id;
  const { data: availability, isLoading } = useTeamAvailability(userId);
  const createAvailability = useCreateAvailability();
  const updateAvailability = useUpdateAvailability();
  const deleteAvailability = useDeleteAvailability();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');

  const handleAddAvailability = async () => {
    if (!businessId || !userId) return;

    // Validate times
    if (newStartTime >= newEndTime) {
      toast.error('End time must be after start time');
      return;
    }

    await createAvailability.mutateAsync({
      business_id: businessId,
      user_id: userId,
      day_of_week: newDayOfWeek,
      start_time: newStartTime,
      end_time: newEndTime,
      is_available: true,
    });

    setShowAddForm(false);
    setNewDayOfWeek(1);
    setNewStartTime('09:00');
    setNewEndTime('17:00');
  };

  const handleToggleAvailability = async (id: string, currentState: boolean) => {
    await updateAvailability.mutateAsync({
      id,
      is_available: !currentState,
    });
  };

  const handleDeleteAvailability = async (id: string) => {
    await deleteAvailability.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Group by day of week
  const availabilityByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    slots: (availability || [])
      .filter(a => a.day_of_week === day.value)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Set your weekly availability schedule</span>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Time Slot
        </Button>
      </div>

      {showAddForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <h4 className="font-medium">Add Availability Slot</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={newDayOfWeek.toString()} onValueChange={(v) => setNewDayOfWeek(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAddAvailability} disabled={createAvailability.isPending}>
                Add
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {availabilityByDay.map(day => (
          <div key={day.value} className="border rounded-lg p-3">
            <div className="font-medium mb-2">{day.label}</div>
            {day.slots.length === 0 ? (
              <div className="text-sm text-muted-foreground">Not available</div>
            ) : (
              <div className="space-y-2">
                {day.slots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={slot.is_available}
                        onCheckedChange={() => handleToggleAvailability(slot.id, slot.is_available)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAvailability(slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
