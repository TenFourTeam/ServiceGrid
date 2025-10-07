import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, MapPin, Clock, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function JobConfirmation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);

  // Define titles and descriptions
  const content = useMemo(() => {
    if (!token) {
      return {
        title: "Invalid Link",
        description: "This confirmation link is invalid. Please check your email for the correct link.",
        icon: <AlertCircle className="h-16 w-16 text-destructive" />,
      };
    }

    if (error) {
      return {
        title: "Error",
        description: error,
        icon: <AlertCircle className="h-16 w-16 text-destructive" />,
      };
    }

    if (confirmed) {
      return {
        title: "Appointment Confirmed!",
        description: "Thank you for confirming your appointment. We look forward to serving you!",
        icon: <CheckCircle2 className="h-16 w-16 text-success" />,
      };
    }

    return null;
  }, [token, error, confirmed]);

  // Fetch job details
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchJobDetails = async () => {
      try {
        const response = await fetch(
          `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/job-confirm?token=${token}`
        );
        const data = await response.json();

        if (!response.ok || !data.job) {
          setError(data.error || "Job not found or confirmation link has expired.");
          return;
        }

        const job = data.job;
        
        // Check if already confirmed
        if (job.confirmed_at || job.status === 'Schedule Approved') {
          setConfirmed(true);
        }

        setJobDetails(job);
      } catch (err: any) {
        console.error("Error fetching job details:", err);
        setError("Failed to load appointment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [token]);

  // Update document title and canonical URL for SEO
  useEffect(() => {
    document.title = confirmed 
      ? "Appointment Confirmed | ServiceGrid" 
      : "Confirm Your Appointment | ServiceGrid";
    
    const canonicalLink = document.querySelector("link[rel='canonical']");
    if (canonicalLink) {
      canonicalLink.setAttribute("href", window.location.href);
    }
  }, [confirmed]);

  const handleConfirm = async () => {
    if (!token) return;

    setConfirming(true);
    setError(null);

    try {
      const response = await fetch(
        `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/job-confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm appointment.");
      }

      setConfirmed(true);
    } catch (err: any) {
      console.error("Error confirming appointment:", err);
      setError(err.message || "Failed to confirm appointment. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="pt-12 pb-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading appointment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl">Appointment Confirmation</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-8 pb-6">
          {content ? (
            // Error or Success State
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                {content.icon}
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{content.title}</h2>
                <p className="text-muted-foreground">{content.description}</p>
              </div>

              {confirmed && jobDetails && (
                <div className="mt-8 p-6 bg-muted/50 rounded-lg text-left space-y-4">
                  <h3 className="font-semibold text-lg">Appointment Details</h3>
                  
                  {jobDetails.title && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Service</p>
                        <p className="text-muted-foreground">{jobDetails.title}</p>
                      </div>
                    </div>
                  )}

                  {jobDetails.starts_at && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-muted-foreground">
                          {format(new Date(jobDetails.starts_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}

                  {jobDetails.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{jobDetails.address}</p>
                      </div>
                    </div>
                  )}

                  {jobDetails.business && (
                    <div className="pt-4 mt-4 border-t">
                      <p className="font-medium mb-2">Contact Information</p>
                      <p className="text-sm text-muted-foreground">
                        {jobDetails.business.name}
                      </p>
                      {jobDetails.business.phone && (
                        <p className="text-sm text-muted-foreground">
                          {jobDetails.business.phone}
                        </p>
                      )}
                      {jobDetails.business.reply_to_email && (
                        <p className="text-sm text-muted-foreground">
                          {jobDetails.business.reply_to_email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => window.close()}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => window.location.href = "/"}
                >
                  Back to Site
                </Button>
              </div>
            </div>
          ) : (
            // Confirmation Needed State
            jobDetails && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold">Please Confirm Your Appointment</h2>
                  <p className="text-muted-foreground">
                    Review the details below and confirm your scheduled service appointment.
                  </p>
                </div>

                <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                  {jobDetails.title && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Service</p>
                        <p className="text-muted-foreground">{jobDetails.title}</p>
                      </div>
                    </div>
                  )}

                  {jobDetails.starts_at && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-muted-foreground">
                          {format(new Date(jobDetails.starts_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}

                  {jobDetails.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{jobDetails.address}</p>
                      </div>
                    </div>
                  )}

                  {jobDetails.customer && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Customer</p>
                        <p className="text-muted-foreground">{jobDetails.customer.name}</p>
                      </div>
                    </div>
                  )}

                  {jobDetails.business && (
                    <div className="pt-4 mt-4 border-t">
                      <p className="font-medium mb-2">Service Provider</p>
                      <p className="text-sm text-muted-foreground">
                        {jobDetails.business.name}
                      </p>
                      {jobDetails.business.phone && (
                        <p className="text-sm text-muted-foreground">
                          {jobDetails.business.phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => window.close()}
                    disabled={confirming}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="min-w-[200px]"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm Appointment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
