import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MapPin, Calendar } from 'lucide-react';

export default function JobConfirmation() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  
  const token = searchParams.get('token');

  useEffect(() => {
    const loadJobDetails = async () => {
      if (!token) {
        setError('Invalid confirmation link');
        setLoading(false);
        return;
      }

      try {
        // Fetch job details from the Supabase edge function
        const response = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/job-confirm?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.job) {
          setError(data.error || 'Job not found or confirmation link expired');
        } else {
          setJob(data.job);
          if (data.job.status === 'Schedule Approved') {
            setConfirmed(true);
          }
        }
      } catch (err) {
        console.error('Error loading job:', err);
        setError('Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };

    loadJobDetails();
  }, [token]);

  const handleConfirm = async () => {
    if (!job || !token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/job-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to confirm appointment');
      } else {
        setConfirmed(true);
      }
    } catch (err) {
      console.error('Error confirming appointment:', err);
      setError('Failed to confirm appointment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Clock className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p>Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Appointment Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you! Your appointment has been confirmed.
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>Service:</strong> {job?.title || 'Service Appointment'}</p>
              <p><strong>Date:</strong> {new Date(job.starts_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> {new Date(job.starts_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</p>
              {job?.address && (
                <p><strong>Address:</strong> {job.address}</p>
              )}
            </div>
            {job?.business?.phone && (
              <p className="text-sm text-muted-foreground mt-4">
                Questions? Call us at {job.business.phone}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Confirm Your Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="font-semibold text-lg">{job.business?.name}</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{job.title || 'Service Appointment'}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(job.starts_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">
                {new Date(job.starts_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                {job.ends_at && ` - ${new Date(job.ends_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}`}
              </p>
            </div>
            
            {job.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-sm">{job.address}</p>
              </div>
            )}
            
            {job.notes && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm"><strong>Notes:</strong> {job.notes}</p>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleConfirm}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Confirming...' : 'Confirm Appointment'}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Need to reschedule?</p>
            {job.business?.phone && (
              <p>Call us: {job.business.phone}</p>
            )}
            {job.business?.reply_to_email && (
              <p>Email: {job.business.reply_to_email}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}