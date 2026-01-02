import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCreateTimeOffRequest } from '@/hooks/useTimeOff';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/queries/useProfile';

const timeOffSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
}).refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type FormData = z.infer<typeof timeOffSchema>;

interface TimeOffRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimeOffRequestModal({ isOpen, onClose }: TimeOffRequestModalProps) {
  const isMobile = useIsMobile();
  const { businessId } = useBusinessContext();
  const { data: profile } = useProfile();
  const createRequest = useCreateTimeOffRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: {
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  const onSubmit = (data: FormData) => {
    if (!businessId || !profile?.profile?.id) return;

    createRequest.mutate(
      {
        business_id: businessId,
        user_id: profile.profile.id,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        reason: data.reason,
      },
      {
        onSuccess: () => {
          onClose();
          form.reset();
        },
      }
    );
  };

  const content = (
    <Form {...form}>
      <form id="timeoff-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormLabel>End Date</FormLabel>
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
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} placeholder="Reason for time off..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  const actions = (
    <>
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form="timeoff-form" disabled={createRequest.isPending}>
        Submit Request
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Request Time Off</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">
            {content}
          </div>
          <DrawerFooter className="flex-row gap-2">
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        {content}
        <div className="flex justify-end gap-2 pt-4">
          {actions}
        </div>
      </DialogContent>
    </Dialog>
  );
}
