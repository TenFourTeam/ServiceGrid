import { MyBusinessTeamSection } from "@/components/Team/MyBusinessTeamSection";
import { UserInviteActions } from "@/components/Team/UserInviteActions";
import { useUserPendingInvites } from "@/hooks/useUserPendingInvites";
import AppLayout from '@/components/Layout/AppLayout';
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock } from "lucide-react";

export default function Team() {
  const { t } = useLanguage();
  const { data: pendingInvites = [], isLoading: isLoadingInvites } = useUserPendingInvites();

  return (
    <AppLayout title={t('team.title')}>
      <div className="space-y-6">
        {/* Pending Invites Section */}
        {!isLoadingInvites && pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <CardTitle>Pending Invites</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingInvites.length}
                </Badge>
              </div>
              <CardDescription>
                You have business invitations waiting for your response
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInvites.map((invite) => (
                <UserInviteActions key={invite.id} invite={invite} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Single Business Team Management */}
        <MyBusinessTeamSection />
      </div>
    </AppLayout>
  );
}