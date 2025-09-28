import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  const removeMutation = useRemoveMember(businessId);

  // Don't show actions for owners
  if (member.role === 'owner') {
    return null;
  }

  const isRemovingThis = removeMutation.isPending && removeMutation.variables?.id === member.id;
  const canRemove = member.role === 'worker' && !isLastOwner;

  const handleRemove = () => {
    if (!canRemove) return;
    removeMutation.mutate(member);
  };

  return (
    <RequireRole role="owner" fallback={null}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={handleRemove}
            disabled={!canRemove || isRemovingThis}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isRemovingThis ? "Removing..." : "Remove from Team"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </RequireRole>
  );
}