import { useState } from 'react';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserPlus, ChevronDown } from 'lucide-react';

interface ReassignWorkerDropdownProps {
  conversationId: string;
  currentWorkerId?: string;
  currentWorkerName?: string;
  onReassign: (workerId: string | null) => void;
  isLoading?: boolean;
}

export function ReassignWorkerDropdown({
  currentWorkerId,
  currentWorkerName,
  onReassign,
  isLoading = false,
}: ReassignWorkerDropdownProps) {
  const { data: members = [] } = useBusinessMembersData();
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (value: string) => {
    const workerId = value === 'unassigned' ? null : value;
    onReassign(workerId);
    setIsOpen(false);
  };

  return (
    <Select
      value={currentWorkerId || 'unassigned'}
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={isLoading}
    >
      <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 [&>svg]:hidden">
        {currentWorkerName ? (
          <Badge 
            variant="outline" 
            className="text-xs gap-1 cursor-pointer hover:bg-accent border-primary/30 text-primary"
          >
            <UserCheck className="h-3 w-3" />
            Direct: {currentWorkerName}
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Badge>
        ) : (
          <Badge 
            variant="outline" 
            className="text-xs gap-1 cursor-pointer hover:bg-accent border-dashed"
          >
            <UserPlus className="h-3 w-3" />
            Assign Worker
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Badge>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {(member as any).full_name?.[0]?.toUpperCase() || (member as any).email?.[0]?.toUpperCase() || '?'}
              </div>
              <span>{(member as any).full_name || (member as any).email || 'Unknown'}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
