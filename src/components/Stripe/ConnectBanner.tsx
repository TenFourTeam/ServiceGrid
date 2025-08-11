import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
type Props = {
  loading: boolean;
  error?: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
  scheduleText?: string | null;
  onConnect: () => void;
  onRefresh: () => void;
  onDisconnect?: () => void;
};
export default function ConnectBanner({
  loading,
  error,
  chargesEnabled,
  payoutsEnabled,
  detailsSubmitted,
  bankLast4,
  scheduleText,
  onConnect,
  onRefresh,
  onDisconnect
}: Props) {
  if (loading) {
    return <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking payout status…</AlertTitle>
        <AlertDescription>Hang tight while we verify your Stripe account.</AlertDescription>
      </Alert>;
  }
  if (error) {
    return <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Unable to check Stripe status</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-2">
          <span className="text-sm">{error}</span>
          <Button variant="outline" size="sm" onClick={onRefresh}>Retry</Button>
        </AlertDescription>
      </Alert>;
  }
  const ok = !!payoutsEnabled && !!chargesEnabled;
  return <Alert variant={ok ? "default" : "default"}>
      {ok ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Stripe payouts {ok ? "ready" : "not set up"}
        
      </AlertTitle>
      <AlertDescription className="mt-2 flex flex-wrap items-center gap-2">
        {!ok ? <>
            <span className="text-sm">Complete Stripe onboarding to receive funds directly to your bank account.</span>
            <Button onClick={onConnect} size="sm">Set up payouts</Button>
            <Button variant="outline" onClick={onRefresh} size="sm">Refresh</Button>
          </> : <>
            <span className="text-sm">Your account is connected. You can manage payout settings in your Stripe Dashboard.</span>
            {onDisconnect && <Button variant="destructive" onClick={onDisconnect} size="sm">Disconnect</Button>}
            <Button variant="outline" onClick={onRefresh} size="sm">Refresh</Button>
          </>}
      </AlertDescription>
    </Alert>;
}