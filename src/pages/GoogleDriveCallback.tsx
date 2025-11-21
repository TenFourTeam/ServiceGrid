import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuthApi } from '@/hooks/useAuthApi';

/**
 * OAuth Callback Handler for Google Drive Integration
 * 
 * This page receives the OAuth authorization code from Google,
 * exchanges it for access/refresh tokens via the edge function,
 * and communicates the result back to the parent window (popup opener).
 */
export default function GoogleDriveCallback() {
  const [searchParams] = useSearchParams();
  const authApi = useAuthApi();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract OAuth parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // business_id
        const error = searchParams.get('error');

        // Handle OAuth errors from Google
        if (error) {
          throw new Error(`Authorization failed: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!state) {
          throw new Error('Missing state parameter (business ID)');
        }

        // Exchange authorization code for tokens via edge function
        const { data, error: exchangeError } = await authApi.invoke('google-drive-oauth', {
          method: 'GET',
          queryParams: { 
            action: 'callback',
            code,
            state
          }
        });

        if (exchangeError) {
          throw new Error(exchangeError.message || 'Token exchange failed');
        }

        // Success! Communicate back to parent window
        setStatus('success');
        setMessage('Google Drive connected successfully!');

        // Send success message to parent window (popup opener)
        if (window.opener) {
          window.opener.postMessage(
            { 
              type: 'google-drive-oauth-success',
              businessId: state,
              data
            },
            window.location.origin
          );
        }

        // Auto-close popup after short delay
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (err) {
        console.error('[Google Drive OAuth Callback Error]:', err);
        
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An unexpected error occurred');

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage(
            { 
              type: 'google-drive-oauth-error',
              error: err instanceof Error ? err.message : 'Unknown error'
            },
            window.location.origin
          );
        }

        // Auto-close popup after longer delay on error
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, authApi]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="h-16 w-16 text-destructive" />
          )}
        </div>

        {/* Status Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {status === 'loading' && 'Connecting to Google Drive'}
            {status === 'success' && 'Connection Successful'}
            {status === 'error' && 'Connection Failed'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground">
          {status === 'loading' && 'Please wait while we complete the authorization...'}
          {status === 'success' && 'This window will close automatically.'}
          {status === 'error' && 'This window will close shortly. Please try again.'}
        </div>
      </div>
    </div>
  );
}
