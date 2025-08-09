
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type SenderRow = {
  id: string;
  user_id: string;
  provider: string;
  from_email: string;
  from_name: string | null;
  reply_to: string | null;
  sendgrid_sender_id: number | null;
  verified: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export default function EmailSenderSettings() {
  const { data: sender, refetch, isFetching } = useQuery({
    queryKey: ["email-sender"],
    queryFn: async (): Promise<SenderRow | null> => {
      const { data, error } = await supabase.from("email_senders").select("*").maybeSingle();
      if (error) {
        console.error("load sender error", error);
        return null;
      }
      return data as SenderRow | null;
    },
  });

  const [form, setForm] = useState({
    from_name: sender?.from_name ?? "",
    from_email: sender?.from_email ?? "",
    nickname: sender?.from_name ?? sender?.from_email ?? "",
    reply_to: sender?.reply_to ?? sender?.from_email ?? "",
    address: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  // Update form when sender changes
  useMemo(() => {
    setForm((f) => ({
      ...f,
      from_name: sender?.from_name ?? "",
      from_email: sender?.from_email ?? "",
      reply_to: sender?.reply_to ?? sender?.from_email ?? "",
      nickname: sender?.from_name ?? sender?.from_email ?? "",
      
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sender?.from_name, sender?.from_email, sender?.reply_to]);

  const onSave = async () => {
    if (!form.from_email || !form.address || !form.city || !form.state || !form.zip || !form.country) {
      toast({ title: "Missing fields", description: "Please fill required fields marked with *." });
      return;
    }
    const { data, error } = await supabase.functions.invoke("email-setup-sendgrid", {
      body: {
        from_email: form.from_email,
        from_name: form.from_name || undefined,
        nickname: form.nickname || form.from_name || form.from_email,
        reply_to: form.reply_to || form.from_email,
        address: form.address,
        address2: form.address2 || undefined,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      },
    });
    if (error) {
      console.error("email-setup-sendgrid error", error);
      toast({ title: "Failed to save sender", description: String(error.message), variant: "destructive" });
      return;
    }
    toast({ title: "Sender saved", description: data?.verified ? "Sender is verified and ready." : "Verification email sent. Please verify." });
    refetch();
  };

  const onResend = async () => {
    const { error } = await supabase.functions.invoke("email-resend-verification");
    if (error) {
      toast({ title: "Failed to resend verification", description: String(error.message), variant: "destructive" });
      return;
    }
    toast({ title: "Verification email resent" });
  };

  const onRefresh = async () => {
    const { data, error } = await supabase.functions.invoke("email-sender-status");
    if (error) {
      toast({ title: "Failed to refresh", description: String(error.message), variant: "destructive" });
      return;
    }
    toast({ title: "Status refreshed", description: data?.verified ? "Verified" : "Not verified yet" });
    refetch();
  };

  const verified = !!sender?.verified;
  const dirtyEmail = !!(sender?.from_email && sender.from_email !== form.from_email);
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Sending</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>From Name</Label>
            <Input
              value={form.from_name}
              onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
              placeholder="Your Business"
            />
          </div>
          <div>
            <Label>From Email *</Label>
            <Input
              type="email"
              value={form.from_email}
              onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
              placeholder="you@yourdomain.com"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Nickname</Label>
            <Input
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="e.g., Billing"
            />
          </div>
          <div>
            <Label>Reply-To Email</Label>
            <Input
              type="email"
              value={form.reply_to}
              onChange={(e) => setForm((f) => ({ ...f, reply_to: e.target.value }))}
              placeholder={form.from_email || "you@yourdomain.com"}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Address *</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="123 Main St"
            />
          </div>
          <div>
            <Label>Address 2</Label>
            <Input
              value={form.address2}
              onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
              placeholder="Suite 100"
            />
          </div>
          <div>
            <Label>City *</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="City"
            />
          </div>
          <div>
            <Label>State/Province *</Label>
            <Input
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="State"
            />
          </div>
          <div>
            <Label>ZIP/Postal Code *</Label>
            <Input
              value={form.zip}
              onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
              placeholder="12345"
            />
          </div>
          <div>
            <Label>Country *</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              placeholder="US"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onSave}>Save & Send Verification</Button>
          <Button variant="secondary" onClick={onRefresh} disabled={isFetching}>Refresh Status</Button>
          <Button
            variant="outline"
            onClick={onResend}
            disabled={verified || dirtyEmail || !sender?.sendgrid_sender_id}
            title={dirtyEmail ? "Email changed — save to re-verify" : undefined}
          >
            Resend Verification
          </Button>
        </div>
        {dirtyEmail ? (
          <p className="text-xs text-muted-foreground">You've changed the From Email. Click "Save & Send Verification" to re-verify.</p>
        ) : null}

        <div className="text-sm text-muted-foreground">
          Status: {verified ? "Verified ✅" : "Not verified ❌"} {sender?.status ? `(provider: ${sender.status})` : ""}
        </div>
      </CardContent>
    </Card>
  );
}
