import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRemoveMember } from "@/hooks/useBusinessMembers";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, Edit, Trash2, UserX, UserCheck, Shield } from "lucide-react";
import type { BusinessMember } from "@/hooks/useBusinessMembers";

interface TeamMemberActionsProps {
  member: BusinessMember;
  businessId: string;
  canManage: boolean;
  isLastOwner: boolean;
}

export function TeamMemberActions({ member, businessId, canManage, isLastOwner }: TeamMemberActionsProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [newRole, setNewRole] = useState(member.role);
  
  const { toast } = useToast();
  const removeMember = useRemoveMember();

  // Don't show actions for owners or if user can't manage
  if (!canManage || member.role === 'owner') {
    return null;
  }

  const handleRoleChange = async () => {
    try {
      // TODO: Implement role change mutation
      toast({
        title: "Role updated",
        description: `${member.email} is now a ${newRole}`,
      });
      setShowRoleDialog(false);
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async () => {
    if (isLastOwner) {
      toast({
        title: "Cannot remove member",
        description: "Cannot remove the last owner of the business",
        variant: "destructive",
      });
      return;
    }

    try {
      await removeMember.mutateAsync({ businessId, memberId: member.id });
      toast({
        title: "Member removed",
        description: `${member.email} has been removed from the team`,
      });
      setShowRemoveDialog(false);
    } catch (error) {
      toast({
        title: "Failed to remove member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async () => {
    try {
      // TODO: Implement deactivate mutation
      toast({
        title: "Member deactivated",
        description: `${member.email} has been deactivated`,
      });
    } catch (error) {
      toast({
        title: "Failed to deactivate member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async () => {
    try {
      // TODO: Implement reactivate mutation
      toast({
        title: "Member reactivated",
        description: `${member.email} has been reactivated`,
      });
    } catch (error) {
      toast({
        title: "Failed to reactivate member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Change Role
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {member.joined_at ? (
            <DropdownMenuItem onClick={handleDeactivate}>
              <UserX className="h-4 w-4 mr-2" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleReactivate}>
              <UserCheck className="h-4 w-4 mr-2" />
              Reactivate
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowRemoveDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role for {member.email}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Role</label>
              <div className="mt-1">
                <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                  {member.role}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRoleChange} disabled={newRole === member.role}>
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to remove <strong>{member.email}</strong> from your team? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRemove}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? "Removing..." : "Remove Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}