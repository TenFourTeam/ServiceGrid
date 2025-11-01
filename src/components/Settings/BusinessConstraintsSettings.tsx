import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessConstraints, useUpsertConstraint, ConstraintType } from '@/hooks/useBusinessConstraints';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Clock, Calendar } from 'lucide-react';

export function BusinessConstraintsSettings() {
  const { businessId } = useBusinessContext();
  const { data: constraints, isLoading } = useBusinessConstraints();
  const upsertConstraint = useUpsertConstraint();

  const [maxJobsPerDay, setMaxJobsPerDay] = useState<number>(10);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<number>(8);
  const [minTimeBetweenJobs, setMinTimeBetweenJobs] = useState<number>(15);
  const [bufferTime, setBufferTime] = useState<number>(15);

  // Get active constraints
  const getConstraintValue = (type: ConstraintType, defaultValue: number): number => {
    const constraint = constraints?.find(c => c.constraint_type === type && c.is_active);
    return constraint ? Number(constraint.constraint_value) : defaultValue;
  };

  const isConstraintActive = (type: ConstraintType): boolean => {
    const constraint = constraints?.find(c => c.constraint_type === type);
    return constraint?.is_active ?? false;
  };

  const handleSaveConstraint = async (type: ConstraintType, value: number, active: boolean) => {
    if (!businessId) return;
    
    await upsertConstraint.mutateAsync({
      business_id: businessId,
      constraint_type: type,
      constraint_value: value,
      is_active: active,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Settings className="h-4 w-4" />
        <span className="text-sm">Configure automated scheduling rules for your business</span>
      </div>

      {/* Max Jobs Per Day */}
      <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Label className="font-medium">Max Jobs Per Day</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Limit the number of jobs that can be scheduled in a single day
          </p>
          <Select
            value={getConstraintValue('max_jobs_per_day', 10).toString()}
            onValueChange={(value) => handleSaveConstraint('max_jobs_per_day', parseInt(value), isConstraintActive('max_jobs_per_day'))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20, 25, 30].map(num => (
                <SelectItem key={num} value={num.toString()}>{num} jobs</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Switch
          checked={isConstraintActive('max_jobs_per_day')}
          onCheckedChange={(checked) => 
            handleSaveConstraint('max_jobs_per_day', getConstraintValue('max_jobs_per_day', 10), checked)
          }
        />
      </div>

      {/* Max Hours Per Day */}
      <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <Label className="font-medium">Max Hours Per Day</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Maximum total hours of work per day
          </p>
          <Select
            value={getConstraintValue('max_hours_per_day', 8).toString()}
            onValueChange={(value) => handleSaveConstraint('max_hours_per_day', parseInt(value), isConstraintActive('max_hours_per_day'))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[4, 6, 8, 10, 12, 14, 16].map(num => (
                <SelectItem key={num} value={num.toString()}>{num} hours</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Switch
          checked={isConstraintActive('max_hours_per_day')}
          onCheckedChange={(checked) => 
            handleSaveConstraint('max_hours_per_day', getConstraintValue('max_hours_per_day', 8), checked)
          }
        />
      </div>

      {/* Min Time Between Jobs */}
      <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <Label className="font-medium">Buffer Time Between Jobs</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Minimum time buffer between consecutive jobs (for travel and setup)
          </p>
          <Select
            value={getConstraintValue('min_time_between_jobs', 15).toString()}
            onValueChange={(value) => handleSaveConstraint('min_time_between_jobs', parseInt(value), isConstraintActive('min_time_between_jobs'))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 15, 30, 45, 60, 90, 120].map(num => (
                <SelectItem key={num} value={num.toString()}>{num} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Switch
          checked={isConstraintActive('min_time_between_jobs')}
          onCheckedChange={(checked) => 
            handleSaveConstraint('min_time_between_jobs', getConstraintValue('min_time_between_jobs', 15), checked)
          }
        />
      </div>

      <div className="text-xs text-muted-foreground">
        These rules will be automatically checked when creating or editing jobs
      </div>
    </div>
  );
}
