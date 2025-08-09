
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NylasCallbackPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nylas integration removed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mailbox connection via Nylas is no longer supported in this app.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/settings")}>Go to Settings</Button>
            <Button variant="secondary" onClick={() => navigate("/")}>Home</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
