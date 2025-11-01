import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCustomersData } from '@/hooks/useCustomersData';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { RecurringJobTemplate, useCreateRecurringTemplate, useUpdateRecurringTemplate } from '@/hooks/useRecurringJobs';

const recurringJobSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  title: z.string().min(1, 'Title is required'),
  address: z.string().optional(),
  notes: z.string().optional(),
  estimated_duration_minutes: z.number().min(15).max(480),
  recurrence_pattern: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  auto_schedule: z.boolean(),
  time_window_preset: z.enum(['morning', 'afternoon', 'anytime', 'custom']).optional(),
  preferred_time_start: z.string().optional(),
  preferred_time_end: z.string().optional(),
});

type FormData = z.infer<typeof recurringJobSchema>;

interface RecurringJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: RecurringJobTemplate;
}

export function RecurringJobModal({ isOpen, onClose, template }: RecurringJobModalProps) {
  const { t } = useTranslation();
  const { businessId } = useBusinessContext();
  const { data: customers } = useCustomersData();
  const createTemplate = useCreateRecurringTemplate();
  const updateTemplate = useUpdateRecurringTemplate();

  const form = useForm<FormData>({
    resolver: zodResolver(recurringJobSchema),
    defaultValues: {
      customer_id: '',
      title: '',
      address: '',
      notes: '',
      estimated_duration_minutes: 60,
      recurrence_pattern: 'weekly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      auto_schedule: false,
      time_window_preset: 'anytime',
      preferred_time_start: '08:00',
      preferred_time_end: '17:00',
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        customer_id: template.customer_id,
        title: template.title,
        address: template.address || '',
        notes: template.notes || '',
        estimated_duration_minutes: template.estimated_duration_minutes,
        recurrence_pattern: template.recurrence_pattern,
        start_date: template.start_date,
        end_date: template.end_date || '',
        auto_schedule: template.auto_schedule,
        time_window_preset: template.preferred_time_start ? 'custom' : 'anytime',
        preferred_time_start: template.preferred_time_start || '08:00',
        preferred_time_end: template.preferred_time_end || '17:00',
      });
    }
  }, [template, form]);

  const onSubmit = (data: FormData) => {
    // Determine time window based on preset or custom values
    let timeStart: string | undefined;
    let timeEnd: string | undefined;

    if (data.time_window_preset === 'morning') {
      timeStart = '08:00:00';
      timeEnd = '12:00:00';
    } else if (data.time_window_preset === 'afternoon') {
      timeStart = '12:00:00';
      timeEnd = '17:00:00';
    } else if (data.time_window_preset === 'custom') {
      timeStart = data.preferred_time_start ? `${data.preferred_time_start}:00` : undefined;
      timeEnd = data.preferred_time_end ? `${data.preferred_time_end}:00` : undefined;
    }

    const payload = {
      business_id: businessId!,
      customer_id: data.customer_id,
      title: data.title,
      address: data.address,
      notes: data.notes,
      estimated_duration_minutes: data.estimated_duration_minutes,
      recurrence_pattern: data.recurrence_pattern,
      recurrence_config: {}, // Simple config for now
      start_date: data.start_date,
      end_date: data.end_date || undefined,
      is_active: true,
      auto_schedule: data.auto_schedule,
      preferred_time_start: timeStart,
      preferred_time_end: timeEnd,
      assigned_members: [],
    };

    if (template) {
      updateTemplate.mutate(
        { id: template.id, ...payload },
        { onSuccess: onClose }
      );
    } else {
      createTemplate.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Recurring Job Template' : 'Create Recurring Job Template'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Lawn Maintenance" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Service address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurrence_pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="time_window_preset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time Window</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="anytime">Anytime</SelectItem>
                      <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                      <SelectItem value="custom">Custom Time Window</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('time_window_preset') === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferred_time_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferred_time_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="auto_schedule"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto-Schedule</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Automatically generate and schedule jobs
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Special instructions..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                {template ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
