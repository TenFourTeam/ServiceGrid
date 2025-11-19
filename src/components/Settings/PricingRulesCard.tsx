import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DollarSign, Percent, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PricingRules {
  materialMarkupPercent: number;
  laborRatePerHour: number; // In cents
  equipmentMarkupPercent: number;
  minimumCharge: number; // In cents
  emergencyMultiplier: number;
}

export function PricingRulesCard() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<PricingRules>({
    materialMarkupPercent: 50,
    laborRatePerHour: 8500,
    equipmentMarkupPercent: 30,
    minimumCharge: 15000,
    emergencyMultiplier: 1.5
  });

  useEffect(() => {
    fetchPricingRules();
  }, [businessId]);

  const fetchPricingRules = async () => {
    try {
      const { data, error } = await authApi.invoke('pricing-rules-crud', {
        method: 'GET'
      });

      if (!error && data) {
        setRules({
          materialMarkupPercent: data.material_markup_percent || 50,
          laborRatePerHour: data.labor_rate_per_hour || 8500,
          equipmentMarkupPercent: data.equipment_markup_percent || 30,
          minimumCharge: data.minimum_charge || 15000,
          emergencyMultiplier: data.emergency_multiplier || 1.5
        });
      }
    } catch (err) {
      console.error('Failed to fetch pricing rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await authApi.invoke('pricing-rules-crud', {
        method: 'POST',
        body: {
          material_markup_percent: rules.materialMarkupPercent,
          labor_rate_per_hour: rules.laborRatePerHour,
          equipment_markup_percent: rules.equipmentMarkupPercent,
          minimum_charge: rules.minimumCharge,
          emergency_multiplier: rules.emergencyMultiplier
        },
        toast: {
          success: 'Pricing rules updated successfully',
          error: 'Failed to update pricing rules'
        }
      });

      if (!error) {
        toast.success('Pricing rules updated successfully');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Pricing Rules Engine
        </CardTitle>
        <CardDescription>
          Configure automatic pricing calculations for AI-generated estimates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="materialMarkup" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Material Markup (%)
            </Label>
            <Input
              id="materialMarkup"
              type="number"
              value={rules.materialMarkupPercent}
              onChange={(e) => setRules({ ...rules, materialMarkupPercent: parseFloat(e.target.value) || 0 })}
              placeholder="50"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Markup percentage applied to material costs
            </p>
          </div>

          <div>
            <Label htmlFor="laborRate" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Labor Rate ($/hour)
            </Label>
            <Input
              id="laborRate"
              type="number"
              value={(rules.laborRatePerHour / 100).toFixed(2)}
              onChange={(e) => setRules({ ...rules, laborRatePerHour: Math.round(parseFloat(e.target.value || '0') * 100) })}
              placeholder="85.00"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Standard hourly rate for labor
            </p>
          </div>

          <div>
            <Label htmlFor="equipmentMarkup" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Equipment Markup (%)
            </Label>
            <Input
              id="equipmentMarkup"
              type="number"
              value={rules.equipmentMarkupPercent}
              onChange={(e) => setRules({ ...rules, equipmentMarkupPercent: parseFloat(e.target.value) || 0 })}
              placeholder="30"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Markup percentage applied to equipment rental costs
            </p>
          </div>

          <Separator />

          <div>
            <Label htmlFor="minimumCharge" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Minimum Job Charge ($)
            </Label>
            <Input
              id="minimumCharge"
              type="number"
              value={(rules.minimumCharge / 100).toFixed(2)}
              onChange={(e) => setRules({ ...rules, minimumCharge: Math.round(parseFloat(e.target.value || '0') * 100) })}
              placeholder="150.00"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum charge for any job, regardless of size
            </p>
          </div>

          <div>
            <Label htmlFor="emergencyMultiplier">Emergency Rate Multiplier</Label>
            <Input
              id="emergencyMultiplier"
              type="number"
              step="0.1"
              value={rules.emergencyMultiplier}
              onChange={(e) => setRules({ ...rules, emergencyMultiplier: parseFloat(e.target.value) || 1.0 })}
              placeholder="1.5"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Multiplier for emergency/after-hours jobs (e.g., 1.5 = 50% premium)
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Pricing Rules'}
        </Button>
      </CardContent>
    </Card>
  );
}
