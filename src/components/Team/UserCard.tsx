import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, UserPlus, AlertCircle, Mail } from "lucide-react";

interface UserCardProps {
  email: string;
  status: {
    checking: boolean;
    exists: boolean;
    alreadyMember: boolean;
    user?: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
  };
  onSendMembershipRequest: (userId?: string) => void;
  isProcessing?: boolean;
}

export function UserCard({ 
  email, 
  status, 
  onSendMembershipRequest,
  isProcessing = false 
}: UserCardProps) {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.split('@')[0].slice(0, 2).toUpperCase() || '??';
  };

  if (status.checking) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.alreadyMember) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={status.user?.name ? `https://api.dicebear.com/7.x/initials/svg?seed=${status.user.name}` : undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(status.user?.name, email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{status.user?.name || email.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Already a member
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.exists) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={status.user?.name ? `https://api.dicebear.com/7.x/initials/svg?seed=${status.user.name}` : undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(status.user?.name, email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{status.user?.name || email.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <Badge variant="default" className="text-xs flex items-center gap-1 w-fit mt-1">
                <CheckCircle className="h-3 w-3" />
                User found
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={() => onSendMembershipRequest(status.user!.id)}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-secondary/20 bg-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-xs">
              {getInitials(undefined, email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-sm">{email.split('@')[0]}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit mt-1">
              <Mail className="h-3 w-3" />
              New user
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" />
            User must sign up first
          </div>
        </div>
      </CardContent>
    </Card>
  );
}