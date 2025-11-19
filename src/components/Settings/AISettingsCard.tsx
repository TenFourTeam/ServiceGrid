import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Sparkles, BarChart3, History } from 'lucide-react';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export function AISettingsCard() {
  const { business } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const [enabled, setEnabled] = useState(business?.ai_vision_enabled ?? true);
  const [creditLimit, setCreditLimit] = useState<string>(
    business?.ai_monthly_credit_limit?.toString() || ''
  );

  const creditsUsed = Number(business?.ai_credits_used_this_month) || 0;
  const limitValue = creditLimit ? parseInt(creditLimit) : null;
  const percentageUsed = limitValue ? Math.min((creditsUsed / limitValue) * 100, 100) : 0;

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await authApi.invoke('update-business-settings', {
        method: 'PATCH',
        body: {
          ai_vision_enabled: enabled,
          ai_monthly_credit_limit: creditLimit ? parseInt(creditLimit) : null,
        },
      });
      
      toast.success('AI settings updated');
      queryClient.invalidateQueries({ queryKey: ['business'] });
    } catch (error) {
      console.error('Failed to update AI settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle>AI Features</CardTitle>
        </div>
        <CardDescription>
          Manage AI-powered features and usage limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable AI Vision Features</Label>
            <p className="text-sm text-muted-foreground">
              AI-powered invoice scanning, estimates, and checklist generation
            </p>
          </div>
          <Switch
            checked={Boolean(enabled)}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Monthly Credit Limit</Label>
          <Input
            type="number"
            placeholder="Unlimited"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            min="0"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for unlimited usage
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Credits Used This Month</Label>
            <span className="text-sm font-medium">
              {creditsUsed.toLocaleString()}{limitValue ? ` / ${limitValue.toLocaleString()}` : ''}
            </span>
          </div>
          {limitValue && limitValue > 0 && (
            <div className="space-y-1">
              <Progress value={percentageUsed} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {percentageUsed.toFixed(1)}% of monthly limit
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={isUpdating}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
