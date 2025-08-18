import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useJobAssignments } from "@/hooks/useJobAssignments";
import { useBusinessMembersData } from "@/hooks/useBusinessMembers";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import type { Job, BusinessMember } from "@/types";

interface JobMemberAssignmentsProps {
  job: Job;
}

export function JobMemberAssignments({ job }: JobMemberAssignmentsProps) {
  const { canManage } = useBusinessContext();
  const { data: allMembers, isLoading: membersLoading } = useBusinessMembersData();
  const { assignMembers, unassignMembers } = useJobAssignments();
  const [showAssignment, setShowAssignment] = useState(false);

  // Only show this component to owners
  if (!canManage) {
    return null;
  }

  if (membersLoading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Loading team members...</div>
      </Card>
    );
  }

  const assignedMembers = job.assignedMembers || [];
  const unassignedMembers = allMembers.filter(member => 
    !assignedMembers.some(assigned => assigned.user_id === member.user_id)
  );

  const handleAssign = async (member: BusinessMember) => {
    await assignMembers.mutateAsync({
      jobId: job.id,
      userIds: [member.user_id]
    });
  };

  const handleUnassign = async (member: BusinessMember) => {
    await unassignMembers.mutateAsync({
      jobId: job.id,
      userIds: [member.user_id]
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Team Assignment</h4>
        {unassignedMembers.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignment(!showAssignment)}
            className="h-8"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Assign
          </Button>
        )}
      </div>

      {/* Currently Assigned Members */}
      {assignedMembers.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Assigned members:</div>
          <div className="flex flex-wrap gap-2">
            {assignedMembers.map((member) => (
              <Badge
                key={member.user_id}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span>{member.name || member.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleUnassign(member)}
                  disabled={unassignMembers.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No team members assigned to this job
        </div>
      )}

      {/* Assignment Interface */}
      {showAssignment && unassignedMembers.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm text-muted-foreground">Available members:</div>
          <div className="space-y-2">
            {unassignedMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {member.name || member.email}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAssign(member)}
                  disabled={assignMembers.isPending}
                  className="h-8"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}