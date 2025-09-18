import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/Layout/AppLayout";
import { useOtherUserTimesheet } from "@/hooks/useOtherUserTimesheet";
import { TimesheetEntryEdit } from "@/components/Timesheet/TimesheetEntryEdit";
import { format, differenceInHours, differenceInMinutes, isToday, parseISO } from "date-fns";
import { useBusinessContext } from "@/hooks/useBusinessContext";

export default function MemberTimesheet() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { role } = useBusinessContext();
  const [editingEntry, setEditingEntry] = useState<any>(null);
  
  const { 
    entries, 
    isLoading, 
    memberInfo,
    editEntry, 
    isEditingEntry 
  } = useOtherUserTimesheet(userId!);

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return "In progress";
    
    const start = parseISO(clockIn);
    const end = parseISO(clockOut);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    
    return `${hours}h ${minutes}m`;
  };

  const todayEntries = entries?.filter(entry => 
    isToday(parseISO(entry.clock_in_time))
  ) || [];

  const totalHoursTodayFormatted = todayEntries.reduce((total, entry) => {
    if (!entry.clock_out_time) return total;
    const start = parseISO(entry.clock_in_time);
    const end = parseISO(entry.clock_out_time);
    return total + differenceInHours(end, start) + (differenceInMinutes(end, start) % 60) / 60;
  }, 0).toFixed(1);

  const handleEditEntry = (entryData: any) => {
    editEntry({
      entryId: editingEntry.id,
      clockInTime: entryData.clockInTime,
      clockOutTime: entryData.clockOutTime,
      notes: entryData.notes,
      action: 'edit',
      targetUserId: userId
    });
    setEditingEntry(null);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading timesheet...</div>
        </div>
      </AppLayout>
    );
  }

  if (!memberInfo) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Member not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/team")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{memberInfo.full_name || memberInfo.email}</h1>
            <p className="text-muted-foreground">Timesheet View</p>
          </div>
        </div>

        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{todayEntries.length}</div>
                <div className="text-sm text-muted-foreground">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalHoursTodayFormatted}h</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {todayEntries.some(entry => !entry.clock_out_time) ? "Active" : "Complete"}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries && entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No timesheet entries found for this member.
              </div>
            ) : (
              <div className="space-y-3">
                {entries?.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 border rounded-lg bg-card transition-colors ${
                      role === 'owner' 
                        ? 'cursor-pointer hover:bg-muted/50' 
                        : ''
                    }`}
                    onClick={role === 'owner' ? () => setEditingEntry(entry) : undefined}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(parseISO(entry.clock_in_time), "MMM dd, yyyy 'at' h:mm a")}
                        </span>
                        {!entry.clock_out_time && (
                          <Badge variant="secondary" className="text-xs">
                            In Progress
                          </Badge>
                        )}
                      </div>
                      {entry.clock_out_time && (
                        <div className="text-sm text-muted-foreground">
                          Ended: {format(parseISO(entry.clock_out_time), "h:mm a")}
                        </div>
                      )}
                      {entry.notes && (
                        <div className="text-sm text-muted-foreground">
                          Notes: {entry.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {calculateDuration(entry.clock_in_time, entry.clock_out_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <TimesheetEntryEdit
          entry={editingEntry}
          onEdit={handleEditEntry}
          isEditing={isEditingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
        />
      )}
    </AppLayout>
  );
}