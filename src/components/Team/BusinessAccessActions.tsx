import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRemoveBusinessAccess } from "@/hooks/useRemoveBusinessAccess";
import { MoreVertical, LogOut } from "lucide-react";
import type { UserBusiness } from "@/hooks/useUserBusinesses";

interface BusinessAccessActionsProps {
  business: UserBusiness;
}

export function BusinessAccessActions({ business }: BusinessAccessActionsProps) {
  const removeMutation = useRemoveBusinessAccess();

  // Don't show actions for owners or current business
  if (business.role === 'owner' || business.is_current) {
    return null;
  }

  const isRemovingThis = removeMutation.isPending && removeMutation.variables?.id === business.id;

  const handleRemove = () => {
    removeMutation.mutate(business);
  };

  return (
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
          onClick={(e) => { e.stopPropagation(); handleRemove(); }}
          disabled={isRemovingThis}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isRemovingThis ? "Leaving..." : "Leave Business"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}