import { useState } from 'react';
import { Clock, Play, Square, ClipboardList } from 'lucide-react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDistance, format, differenceInMinutes } from 'date-fns';
import { TimesheetEntryEdit } from '@/components/Timesheet/TimesheetEntryEdit';

export default function Timesheet() {
  const { t } = useLanguage();
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
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

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
    <AppLayout title={t('timesheet.title')}>
      <div className="space-y-6 max-w-4xl">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('timesheet.currentStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {isClockedIn ? t('timesheet.status.clockedIn') : t('timesheet.status.clockedOut')}
                </p>
                {activeEntry && (
                  <p className="text-muted-foreground">
                    {t('timesheet.summary.since')} {format(new Date(activeEntry.clock_in_time), 'h:mm a')} 
                    ({formatDistance(new Date(activeEntry.clock_in_time), new Date(), { addSuffix: true })})
                  </p>
                )}
              </div>
              <Badge variant={isClockedIn ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                {isClockedIn ? t('timesheet.status.active') : t('timesheet.status.inactive')}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('timesheet.form.notesOptional')}</Label>
              <Textarea
                id="notes"
                placeholder={t('timesheet.form.notesPlaceholder')}
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
                  {isClockingIn ? t('timesheet.actions.clockingIn') : t('timesheet.actions.clockIn')}
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
                  {isClockingOut ? t('timesheet.actions.clockingOut') : t('timesheet.actions.clockOut')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t('timesheet.todaysSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('timesheet.summary.totalHoursWorked')}</span>
              <span className="text-xl font-semibold">{totalHoursTodayFormatted}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t('timesheet.recentEntries')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">{t('timesheet.loading')}</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground">{t('timesheet.noEntries')}</p>
            ) : (
              <div className="space-y-3">
                {entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      role === 'owner' 
                        ? 'cursor-pointer hover:bg-muted/50' 
                        : ''
                    }`}
                    onClick={role === 'owner' ? () => setEditingEntry(entry.id) : undefined}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(new Date(entry.clock_in_time), 'MMM d, yyyy')}
                        </span>
                        {!entry.clock_out_time && (
                          <Badge variant="default" className="text-xs">
                            {t('timesheet.status.active')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.clock_in_time), 'h:mm a')} - {' '}
                        {entry.clock_out_time 
                          ? format(new Date(entry.clock_out_time), 'h:mm a')
                          : t('timesheet.status.inProgress')
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Drawer */}
      {editingEntry && (
        <TimesheetEntryEdit
          entry={entries.find(e => e.id === editingEntry)!}
          onEdit={editEntry}
          isEditing={isEditingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
        />
      )}
    </AppLayout>
  );
}