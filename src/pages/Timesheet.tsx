import { useState } from 'react';
import { Clock, Play, Square, ClipboardList } from 'lucide-react';
import { useTimesheet } from '@/hooks/useTimesheet';
import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDistance, format, differenceInMinutes } from 'date-fns';
import { TimesheetEntryEdit } from '@/components/Timesheet/TimesheetEntryEdit';

export default function Timesheet() {
  const { 
    entries, 
    isLoading, 
    isClockedIn, 
    activeEntry, 
    role,
    clockIn, 
    clockOut, 
    editEntry,
    isClockingIn, 
    isClockingOut,
    isEditingEntry
  } = useTimesheet();
  
  const [notes, setNotes] = useState('');

  const handleClockIn = () => {
    clockIn({ notes: notes.trim() || undefined });
    setNotes('');
  };

  const handleClockOut = () => {
    if (!activeEntry) return;
    clockOut({ 
      entryId: activeEntry.id, 
      notes: notes.trim() || undefined 
    });
    setNotes('');
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    const startTime = new Date(clockIn);
    const endTime = clockOut ? new Date(clockOut) : new Date();
    const minutes = differenceInMinutes(endTime, startTime);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const totalHoursToday = entries
    .filter(entry => {
      const entryDate = new Date(entry.clock_in_time).toDateString();
      const today = new Date().toDateString();
      return entryDate === today && entry.clock_out_time;
    })
    .reduce((total, entry) => {
      const minutes = differenceInMinutes(
        new Date(entry.clock_out_time!),
        new Date(entry.clock_in_time)
      );
      return total + minutes;
    }, 0);

  const totalHoursTodayFormatted = `${Math.floor(totalHoursToday / 60)}h ${totalHoursToday % 60}m`;

  return (
    <AppLayout title="Timesheet">
      <div className="space-y-6 max-w-4xl">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                </p>
                {activeEntry && (
                  <p className="text-muted-foreground">
                    Since {format(new Date(activeEntry.clock_in_time), 'h:mm a')} 
                    ({formatDistance(new Date(activeEntry.clock_in_time), new Date(), { addSuffix: true })})
                  </p>
                )}
              </div>
              <Badge variant={isClockedIn ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                {isClockedIn ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about your work session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              {!isClockedIn ? (
                <Button
                  onClick={handleClockIn}
                  disabled={isClockingIn}
                  size="lg"
                  className="flex-1"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isClockingIn ? 'Clocking In...' : 'Clock In'}
                </Button>
              ) : (
                <Button
                  onClick={handleClockOut}
                  disabled={isClockingOut}
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                >
                  <Square className="mr-2 h-4 w-4" />
                  {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Hours Worked:</span>
              <span className="text-xl font-semibold">{totalHoursTodayFormatted}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading entries...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground">No timesheet entries yet.</p>
            ) : (
              <div className="space-y-3">
                {entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(new Date(entry.clock_in_time), 'MMM d, yyyy')}
                        </span>
                        {!entry.clock_out_time && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.clock_in_time), 'h:mm a')} - {' '}
                        {entry.clock_out_time 
                          ? format(new Date(entry.clock_out_time), 'h:mm a')
                          : 'In Progress'
                        }
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="font-semibold">
                          {calculateDuration(entry.clock_in_time, entry.clock_out_time)}
                        </span>
                      </div>
                      {role === 'owner' && (
                        <TimesheetEntryEdit
                          entry={entry}
                          onEdit={editEntry}
                          isEditing={isEditingEntry}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}