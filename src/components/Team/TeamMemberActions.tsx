import { useState, startTransition } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRemoveMember } from "@/hooks/useRemoveMember";
import { MoreVertical, Trash2 } from "lucide-react";
import type { BusinessMember } from "@/hooks/useBusinessMembers";
import { RequireRole } from "@/components/Auth/RequireRole";

interface TeamMemberActionsProps {
  member: BusinessMember;
  businessId: string;
  isLastOwner: boolean;
}

export function TeamMemberActions({ member, businessId, isLastOwner }: TeamMemberActionsProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const removeMutation = useRemoveMember(businessId);

  // Don't show actions for owners
  if (member.role === 'owner') {
    return null;
  }

  const isRemovingThis = removeMutation.isPending && removeMutation.variables?.id === member.id;
  const canRemove = member.role === 'worker' && !isLastOwner;

  const handleRemove = () => {
    if (!canRemove) return;
    
    console.log('[TeamMemberActions] Starting member removal:', member.id);
    
    removeMutation.mutate(member, {
      onSuccess: () => {
        // Close UI chrome *after* success so no overlay captures clicks
        startTransition(() => setShowRemoveDialog(false));
      },
      onError: () => {
        // Keep dialog open on error so user can retry
      },
    });
  };

  return (
    <RequireRole role="owner" fallback={null}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              setShowRemoveDialog(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
              <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRemoveDialog(false); }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={!canRemove || isRemovingThis}
              >
                {isRemovingThis ? "Removing..." : "Remove Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </RequireRole>
  );
}