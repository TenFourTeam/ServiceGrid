import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { TimesheetEntry } from '@/hooks/useTimesheet';

interface TimesheetEntryEditProps {
  entry: TimesheetEntry;
  onEdit: (data: {
    entryId: string;
    clockInTime?: string;
    clockOutTime?: string;
    notes?: string;
  }) => void;
  isEditing: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimesheetEntryEdit({ entry, onEdit, isEditing, open, onOpenChange }: TimesheetEntryEditProps) {
  const [clockInTime, setClockInTime] = useState(
    format(new Date(entry.clock_in_time), "yyyy-MM-dd'T'HH:mm")
  );
  const [clockOutTime, setClockOutTime] = useState(
    entry.clock_out_time ? format(new Date(entry.clock_out_time), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [notes, setNotes] = useState(entry.notes || '');

  const handleSubmit = () => {
    onEdit({
      entryId: entry.id,
      clockInTime: new Date(clockInTime).toISOString(),
      clockOutTime: clockOutTime ? new Date(clockOutTime).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Timesheet Entry</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4">
          <div>
            <Label htmlFor="clock-in-time">Clock In Time</Label>
            <Input
              id="clock-in-time"
              type="datetime-local"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="clock-out-time">Clock Out Time</Label>
            <Input
              id="clock-out-time"
              type="datetime-local"
              value={clockOutTime}
              onChange={(e) => setClockOutTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this time entry..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isEditing}>
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}