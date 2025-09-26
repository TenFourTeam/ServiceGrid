import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { usePrimaryBusiness } from "@/hooks/usePrimaryBusiness";
import { Users, Building2 } from "lucide-react";

export function MyBusinessTeamSection() {
  const { data: primaryBusiness, isLoading, error } = usePrimaryBusiness();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Business Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading team...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !primaryBusiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Business Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No primary business found</p>
            <p className="text-sm">
              {error instanceof Error ? `Error: ${error.message}` : "Unable to load your business team"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Business Team
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Manage team members for {primaryBusiness.name}
        </p>
      </CardHeader>
      <CardContent>
        <BusinessMembersList businessId={primaryBusiness.id} />
      </CardContent>
    </Card>
  );
}