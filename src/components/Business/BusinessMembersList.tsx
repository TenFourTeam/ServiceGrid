import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusinessMembers, useInviteWorker, useRemoveMember } from "@/hooks/useBusinessMembers";
import { usePendingInvites, useRevokeInvite, useResendInvite } from "@/hooks/useInvites";
import { UserPlus, Trash2, Mail, Clock, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessMembersListProps {
  businessId: string;
  canManage: boolean;
}

export function BusinessMembersList({ businessId, canManage }: BusinessMembersListProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const { data: membersData, isLoading } = useBusinessMembers(businessId);
  const { data: invitesData, isLoading: loadingInvites } = usePendingInvites(businessId);
  const inviteWorker = useInviteWorker();
  const removeMember = useRemoveMember();
  const revokeInvite = useRevokeInvite();
  const resendInvite = useResendInvite();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await inviteWorker.mutateAsync({
        businessId,
        email: inviteEmail.trim(),
      });
      setInviteEmail("");
      setIsInviting(false);
      toast({
        title: "Invitation sent",
        description: `Invited ${inviteEmail} to join your business`,
      });
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (memberId: string, memberEmail?: string) => {
    if (!confirm(`Remove ${memberEmail || 'this member'} from your business?`)) return;

    try {
      await removeMember.mutateAsync({ businessId, memberId });
      toast({
        title: "Member removed",
        description: "The member has been removed from your business",
      });
    } catch (error) {
      toast({
        title: "Failed to remove member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }

    try {
      await revokeInvite.mutateAsync({ inviteId });
      toast({
        title: "Invitation revoked",
        description: `Invitation for ${email} has been revoked`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke invitation",
        variant: "destructive",
      });
    }
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    try {
      await resendInvite.mutateAsync({ inviteId });
      toast({
        title: "Invitation resent",
        description: `Invitation for ${email} has been resent`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading team members...</div>;
  }

  const members = membersData?.members || [];
  const invites = invitesData?.invites || [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Team Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage team members and pending invitations
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsInviting(!isInviting)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite Worker
          </Button>
        )}
      </div>

      {isInviting && canManage && (
        <form onSubmit={handleInvite} className="mb-6 p-4 border rounded-lg bg-muted/20">
          <Label htmlFor="invite-email" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="worker@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={inviteWorker.isPending}>
              {inviteWorker.isPending ? "Sending..." : "Send Invite"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviting(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invites">
            Pending Invites ({invites.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-4 mt-4">
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              {canManage && (
                <p className="text-sm">Invite workers to collaborate on your business</p>
              )}
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.email}</span>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {member.joined_at ? (
                        <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                      ) : (
                        <>
                          <Mail className="h-3 w-3" />
                          <span>Invited {new Date(member.invited_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {canManage && member.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(member.id, member.email)}
                    disabled={removeMember.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-4 mt-4">
          {loadingInvites ? (
            <div className="text-center py-8">Loading invites...</div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending invitations</p>
              {canManage && (
                <p className="text-sm">Invite workers to see pending invitations here</p>
              )}
            </div>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invite.email}</span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sent {new Date(invite.created_at).toLocaleDateString()} • 
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(invite.id, invite.email)}
                      disabled={resendInvite.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeInvite(invite.id, invite.email)}
                      disabled={revokeInvite.isPending}
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}