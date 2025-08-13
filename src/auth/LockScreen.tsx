import React, { useState, useEffect } from "react";
import { SignInButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, RefreshCw, Clock } from "lucide-react";
import { useAuthSnapshot } from "./AuthKernel";

export default function LockScreen() {
  const { refreshAuth } = useAuthSnapshot();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>("");

  // Update time since lock every minute
  useEffect(() => {
    const updateTime = () => {
      const minutes = Math.floor((Date.now() - Date.now()) / 60000);
      setTimeAgo(minutes < 1 ? "just now" : `${minutes}m ago`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickUnlock = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuth();
    } catch (error) {
      console.error('Quick unlock failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle>Session Locked</CardTitle>
          <CardDescription className="space-y-1">
            <div>Your session was locked due to inactivity.</div>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Locked {timeAgo}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInButton mode="modal" forceRedirectUrl={window.location.pathname}>
            <Button className="w-full" size="lg">
              Sign In to Continue
            </Button>
          </SignInButton>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleQuickUnlock}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Quick Unlock
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Sessions lock after 20 minutes of inactivity for security.</p>
            <p>Activity is synchronized across all open tabs.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}