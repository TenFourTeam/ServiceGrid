import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { useAuthApi } from './useAuthApi';
import { toast } from 'sonner';

type DeviceStatus = 'disconnected' | 'connecting' | 'ready' | 'error';

interface VoIPState {
  deviceStatus: DeviceStatus;
  activeCall: Call | null;
  isMuted: boolean;
  isOnHold: boolean;
  isRinging: boolean;
  incomingCall: Call | null;
}

export function useVoIP() {
  const authApi = useAuthApi();
  const deviceRef = useRef<Device | null>(null);
  const tokenExpiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<VoIPState>({
    deviceStatus: 'disconnected',
    activeCall: null,
    isMuted: false,
    isOnHold: false,
    isRinging: false,
    incomingCall: null,
  });

  // Fetch access token and initialize device
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, deviceStatus: 'connecting' }));

      const result = await authApi.invoke('voip-get-access-token?deviceName=web-browser', {
        method: 'GET',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to get access token');
      }

      const { token, expiresAt } = result.data;

      if (!token) {
        throw new Error('No token received');
      }

      // Initialize Twilio Device
      const device = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        enableImprovedSignalingErrorPrecision: true,
      });

      // Device event handlers
      device.on('registered', () => {
        console.log('[useVoIP] Device registered');
        setState(prev => ({ ...prev, deviceStatus: 'ready' }));
      });

      device.on('error', (error) => {
        console.error('[useVoIP] Device error:', error);
        setState(prev => ({ ...prev, deviceStatus: 'error' }));
        toast.error('VoIP connection error');
      });

      device.on('incoming', (call) => {
        console.log('[useVoIP] Incoming call from:', call.parameters.From);
        setState(prev => ({ 
          ...prev, 
          isRinging: true,
          incomingCall: call,
        }));

        // Show incoming call notification
        toast('Incoming Call', {
          description: `From: ${call.parameters.From}`,
          duration: 30000,
        });
      });

      device.on('tokenWillExpire', () => {
        console.log('[useVoIP] Token will expire, refreshing...');
        connect(); // Refresh token
      });

      await device.register();
      deviceRef.current = device;

      // Set up token refresh timer (50 minutes)
      if (tokenExpiryTimerRef.current) {
        clearTimeout(tokenExpiryTimerRef.current);
      }
      tokenExpiryTimerRef.current = setTimeout(() => {
        connect();
      }, 50 * 60 * 1000);

    } catch (error: any) {
      console.error('[useVoIP] Connection error:', error);
      setState(prev => ({ ...prev, deviceStatus: 'error' }));
      
      // Don't show error toast if Twilio isn't configured (expected state)
      if (!error.message?.includes('Twilio not configured')) {
        toast.error(error.message || 'Failed to connect to VoIP service');
      }
    }
  }, [authApi]);

  // Disconnect device
  const disconnect = useCallback(() => {
    if (deviceRef.current) {
      deviceRef.current.unregister();
      deviceRef.current.destroy();
      deviceRef.current = null;
    }

    if (tokenExpiryTimerRef.current) {
      clearTimeout(tokenExpiryTimerRef.current);
      tokenExpiryTimerRef.current = null;
    }

    setState({
      deviceStatus: 'disconnected',
      activeCall: null,
      isMuted: false,
      isOnHold: false,
      isRinging: false,
      incomingCall: null,
    });
  }, []);

  // Dial outbound call
  const dial = useCallback(async (phoneNumber: string, customerId?: string) => {
    if (!deviceRef.current) {
      toast.error('Device not connected');
      return;
    }

    try {
      // First, create the call via edge function to log it
      const result = await authApi.invoke('voip-initiate-call', {
        method: 'POST',
        body: { to: phoneNumber, customerId },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to initiate call');
      }

      // Then connect via Twilio Device SDK
      const call = await deviceRef.current.connect({
        params: {
          To: phoneNumber,
        },
      });

      setupCallHandlers(call);

      setState(prev => ({ ...prev, activeCall: call }));
      toast.success('Call connected');

    } catch (error: any) {
      console.error('[useVoIP] Dial error:', error);
      toast.error(error.message || 'Failed to make call');
    }
  }, [authApi]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (state.incomingCall) {
      state.incomingCall.accept();
      setupCallHandlers(state.incomingCall);
      setState(prev => ({ 
        ...prev, 
        activeCall: state.incomingCall,
        isRinging: false,
        incomingCall: null,
      }));
      toast.success('Call accepted');
    }
  }, [state.incomingCall]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    if (state.incomingCall) {
      state.incomingCall.reject();
      setState(prev => ({ 
        ...prev, 
        isRinging: false,
        incomingCall: null,
      }));
      toast('Call declined');
    }
  }, [state.incomingCall]);

  // Hangup active call
  const hangup = useCallback(() => {
    if (state.activeCall) {
      state.activeCall.disconnect();
      setState(prev => ({ 
        ...prev, 
        activeCall: null,
        isMuted: false,
        isOnHold: false,
      }));
      toast('Call ended');
    }
  }, [state.activeCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (state.activeCall) {
      const newMuteState = !state.isMuted;
      state.activeCall.mute(newMuteState);
      setState(prev => ({ ...prev, isMuted: newMuteState }));
    }
  }, [state.activeCall, state.isMuted]);

  // Toggle hold
  const toggleHold = useCallback(() => {
    if (state.activeCall) {
      const newHoldState = !state.isOnHold;
      // Note: Twilio Voice SDK doesn't have direct hold, use mute as workaround
      state.activeCall.mute(newHoldState);
      setState(prev => ({ ...prev, isOnHold: newHoldState }));
      toast(newHoldState ? 'Call on hold' : 'Call resumed');
    }
  }, [state.activeCall, state.isOnHold]);

  // Setup call event handlers
  const setupCallHandlers = (call: Call) => {
    call.on('disconnect', () => {
      console.log('[useVoIP] Call disconnected');
      setState(prev => ({ 
        ...prev, 
        activeCall: null,
        isMuted: false,
        isOnHold: false,
      }));
    });

    call.on('cancel', () => {
      console.log('[useVoIP] Call canceled');
      setState(prev => ({ 
        ...prev, 
        activeCall: null,
        isRinging: false,
        incomingCall: null,
      }));
    });

    call.on('reject', () => {
      console.log('[useVoIP] Call rejected');
      setState(prev => ({ 
        ...prev, 
        activeCall: null,
        isRinging: false,
        incomingCall: null,
      }));
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    deviceStatus: state.deviceStatus,
    activeCall: state.activeCall,
    isMuted: state.isMuted,
    isOnHold: state.isOnHold,
    isRinging: state.isRinging,
    incomingCall: state.incomingCall,
    connect,
    disconnect,
    dial,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleHold,
  };
}
