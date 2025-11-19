import { formatMoney } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Wrench, Truck, Briefcase, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EstimateBreakdownProps {
  breakdown: {
    materials_total: number;
    labor_total: number;
    equipment_total: number;
    services_total: number;
    total_labor_hours?: number;
    total_crew_size?: number;
  };
}

export function EstimateBreakdown({ breakdown }: EstimateBreakdownProps) {
  const total = 
    breakdown.materials_total + 
    breakdown.labor_total + 
    breakdown.equipment_total + 
    breakdown.services_total;

  const items = [
    {
      icon: Package,
      label: 'Materials',
      amount: breakdown.materials_total,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600',
      show: breakdown.materials_total > 0
    },
    {
      icon: Wrench,
      label: 'Labor',
      amount: breakdown.labor_total,
      color: 'text-green-600',
      bgColor: 'bg-green-600',
      show: breakdown.labor_total > 0,
      subtitle: breakdown.total_labor_hours 
        ? `${breakdown.total_labor_hours}hrs • ${breakdown.total_crew_size} worker${breakdown.total_crew_size! > 1 ? 's' : ''}`
        : undefined
    },
    {
      icon: Truck,
      label: 'Equipment',
      amount: breakdown.equipment_total,
      color: 'text-orange-600',
      bgColor: 'bg-orange-600',
      show: breakdown.equipment_total > 0
    },
    {
      icon: Briefcase,
      label: 'Services',
      amount: breakdown.services_total,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600',
      show: breakdown.services_total > 0
    }
  ].filter(item => item.show);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Cost Breakdown
          <Badge variant="outline" className="ml-auto">
            Total: {formatMoney(total)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const percentage = total > 0 ? (item.amount / total) * 100 : 0;
          
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="font-semibold">{formatMoney(item.amount)}</span>
              </div>
              {item.subtitle && (
                <div className="text-xs text-muted-foreground ml-6 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {item.subtitle}
                </div>
              )}
              <div className="ml-6 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={item.bgColor}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
