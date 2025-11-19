import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, X, Minimize2 } from 'lucide-react';
import { useVoIP } from '@/hooks/useVoIP';
import { usePhoneNumbers } from '@/hooks/usePhoneNumbers';
import { cn } from '@/lib/utils';

export function Softphone() {
  const { phoneNumbers, isLoading: loadingNumbers } = usePhoneNumbers();
  
  const {
    deviceStatus,
    activeCall,
    isMuted,
    isOnHold,
    isRinging,
    incomingCall,
    connect,
    disconnect,
    dial,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleHold,
  } = useVoIP();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [hasAttemptedConnect, setHasAttemptedConnect] = useState(false);

  // Only auto-connect if we have phone numbers
  useEffect(() => {
    if (!loadingNumbers && phoneNumbers && phoneNumbers.length > 0 && !hasAttemptedConnect) {
      setHasAttemptedConnect(true);
      connect();
    }
  }, [phoneNumbers, loadingNumbers, hasAttemptedConnect, connect]);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      setCallTimer(0);
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall]);

  // Auto-open on incoming call
  useEffect(() => {
    if (isRinging) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isRinging]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDial = () => {
    if (phoneNumber.trim()) {
      dial(phoneNumber);
      setPhoneNumber('');
    }
  };

  const handleKeypadClick = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  // Don't show FAB if no phone numbers configured
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg relative"
          onClick={() => setIsOpen(true)}
        >
          <Phone className="h-6 w-6" />
          {(isRinging || activeCall) && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full animate-pulse">
              !
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-64 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium">
                  {activeCall ? formatTimer(callTimer) : 'Call Active'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
              >
                Expand
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">
            ServiceGrid Phone
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={deviceStatus === 'ready' ? 'default' : 'secondary'}>
              {deviceStatus}
            </Badge>
            {activeCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isRinging && incomingCall ? (
            <div className="space-y-4 text-center">
              <div className="py-6">
                <Phone className="h-12 w-12 mx-auto mb-4 text-green-500 animate-bounce" />
                <div className="font-medium text-lg">Incoming Call</div>
                <div className="text-sm text-muted-foreground">
                  {incomingCall.parameters.From}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={declineCall}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button onClick={acceptCall} className="bg-green-500 hover:bg-green-600">
                  <Phone className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          ) : activeCall ? (
            <div className="space-y-4 text-center">
              <div className="py-6">
                <div className="font-medium text-lg">Active Call</div>
                <div className="text-2xl font-mono mt-2">
                  {formatTimer(callTimer)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={isMuted ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isOnHold ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleHold}
                >
                  {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={hangup}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Input
                  placeholder="+1 (512) 555-1234"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleDial()}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <Button
                    key={digit}
                    variant="outline"
                    onClick={() => handleKeypadClick(digit)}
                    className="h-12 text-lg font-medium"
                  >
                    {digit}
                  </Button>
                ))}
              </div>

              <Button
                className="w-full bg-green-500 hover:bg-green-600"
                size="lg"
                onClick={handleDial}
                disabled={!phoneNumber.trim() || deviceStatus !== 'ready'}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
