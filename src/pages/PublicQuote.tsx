
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PublicQuote() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Public quote links disabled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Viewing quotes via public links has been removed. Please contact the sender directly if you need access.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
