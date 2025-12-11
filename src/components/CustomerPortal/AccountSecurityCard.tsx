import React, { useState } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, Eye, EyeOff, Loader2, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function AccountSecurityCard() {
  const { customer, authMethod, hasPassword, setPassword } = useCustomerAuth();
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSettingPassword(true);
    
    const result = await setPassword(password);
    
    if (result.success) {
      toast.success('Password created! You can now sign in with your email and password.');
      setShowForm(false);
      setPasswordValue('');
      setConfirmPassword('');
    } else {
      toast.error(result.error || 'Failed to set password');
    }
    
    setIsSettingPassword(false);
  };

  const getAuthMethodBadge = () => {
    if (hasPassword) {
      return (
        <Badge variant="default" className="gap-1">
          <KeyRound className="h-3 w-3" />
          Password
        </Badge>
      );
    }
    
    switch (authMethod) {
      case 'magic_link':
        return (
          <Badge variant="secondary" className="gap-1">
            <Mail className="h-3 w-3" />
            Magic Link
          </Badge>
        );
      case 'clerk':
        return (
          <Badge variant="secondary" className="gap-1">
            Google
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Account Security</CardTitle>
        </div>
        <CardDescription>Manage your sign-in options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{customer?.email}</p>
          </div>
          {getAuthMethodBadge()}
        </div>

        {/* Password Status / Setup */}
        {hasPassword ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Check className="h-4 w-4 text-green-600" />
            <span>Password sign-in enabled</span>
          </div>
        ) : (
          <>
            {!showForm ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Create a password for faster sign-in without waiting for email links.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  Create Password
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPasswordValue(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={isSettingPassword || password.length < 8}
                  >
                    {isSettingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting...
                      </>
                    ) : (
                      'Set Password'
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setPasswordValue('');
                      setConfirmPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}