import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBusinessContext } from "@/hooks/useBusinessContext";

export function WorkerLimitedAccess() {
  const { role } = useBusinessContext();

  if (role !== 'worker') return null;

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertDescription>
        You have worker access to this business. Some features are restricted to business owners.
      </AlertDescription>
    </Alert>
  );
}