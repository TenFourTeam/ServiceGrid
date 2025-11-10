import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRecurringScheduleDetail, useGenerateNextInvoice, usePauseSubscription, useResumeSubscription, useCancelSubscription } from "@/hooks/useRecurringSchedules";
import { formatCurrency } from "@/utils/money";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw, Pause, Play, XCircle, ExternalLink, Calendar, TrendingUp } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

interface RecurringScheduleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string | null;
}

const frequencyColors: Record<string, string> = {
  Weekly: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Monthly: "bg-green-500/10 text-green-700 dark:text-green-300",
  Quarterly: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Yearly: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

export default function RecurringScheduleDetailModal({
  open,
  onOpenChange,
  scheduleId,
}: RecurringScheduleDetailModalProps) {
  const { data: schedule, isLoading, error } = useRecurringScheduleDetail(scheduleId);
  const generateNextInvoice = useGenerateNextInvoice();
  const pauseSubscription = usePauseSubscription();
  const resumeSubscription = useResumeSubscription();
  const cancelSubscription = useCancelSubscription();
  const navigate = useNavigate();

  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    action: 'generate' | 'pause' | 'resume' | 'cancel' | null;
  }>({ open: false, action: null });

  const handleConfirmAction = () => {
    if (!scheduleId || !confirmAction.action) return;

    switch (confirmAction.action) {
      case 'generate':
        generateNextInvoice.mutate(scheduleId);
        break;
      case 'pause':
        pauseSubscription.mutate(scheduleId);
        break;
      case 'resume':
        resumeSubscription.mutate(scheduleId);
        break;
      case 'cancel':
        cancelSubscription.mutate(scheduleId, {
          onSuccess: () => {
            onOpenChange(false);
          }
        });
        break;
    }

    setConfirmAction({ open: false, action: null });
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices?id=${invoiceId}`);
    onOpenChange(false);
  };

  const handleViewQuote = () => {
    if (schedule) {
      navigate(`/quotes?id=${schedule.quote_id}`);
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recurring Billing Schedule</DialogTitle>
            <DialogDescription>
              Manage subscription details and view invoice history
            </DialogDescription>
          </DialogHeader>

          {isLoading && <LoadingScreen />}

          {error && (
            <div className="text-destructive p-4">
              Failed to load schedule details. Please try again.
            </div>
          )}

          {schedule && (
            <div className="space-y-6">
              {/* Overview Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{schedule.customer_name}</CardTitle>
                      <CardDescription>{schedule.customer_email}</CardDescription>
                    </div>
                    <Badge 
                      variant={schedule.is_active ? "default" : "secondary"}
                      className={schedule.is_active ? "bg-success/10 text-success border-success/20" : ""}
                    >
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Quote</div>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-base font-medium"
                        onClick={handleViewQuote}
                      >
                        {schedule.quote_number}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Frequency</div>
                      <Badge variant="secondary" className={`${frequencyColors[schedule.frequency]} text-base`}>
                        {schedule.frequency}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Amount per Invoice</div>
                      <div className="text-2xl font-bold">{formatCurrency(schedule.amount)}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Next Invoice Date
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-primary">
                          {format(new Date(schedule.next_billing_date), 'MMMM d, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          in {formatDistanceToNow(new Date(schedule.next_billing_date))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Total Invoices</div>
                      <div className="text-2xl font-bold flex items-center justify-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {schedule.total_invoices_generated}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-2xl font-bold text-success">
                        {formatCurrency(schedule.amount * (schedule.total_invoices_generated || 0))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Last Invoice</div>
                      <div className="text-base font-medium">
                        {schedule.last_invoice_date 
                          ? format(new Date(schedule.last_invoice_date), 'MMM d, yyyy')
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => setConfirmAction({ open: true, action: 'generate' })}
                  disabled={!schedule.is_active}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Next Invoice Now
                </Button>

                {schedule.is_active ? (
                  <Button 
                    variant="outline"
                    onClick={() => setConfirmAction({ open: true, action: 'pause' })}
                    className="flex-1 sm:flex-none"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Subscription
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setConfirmAction({ open: true, action: 'resume' })}
                    className="flex-1 sm:flex-none"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume Subscription
                  </Button>
                )}

                <Button 
                  variant="destructive"
                  onClick={() => setConfirmAction({ open: true, action: 'cancel' })}
                  className="flex-1 sm:flex-none"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              </div>

              {/* Invoice History */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>
                    All invoices generated from this recurring schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {schedule.invoices && schedule.invoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.number}</TableCell>
                            <TableCell>
                              {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{invoice.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(invoice.total)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewInvoice(invoice.id)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices generated yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction.open} onOpenChange={(open) => setConfirmAction({ open, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.action === 'generate' && 'Generate Next Invoice?'}
              {confirmAction.action === 'pause' && 'Pause Subscription?'}
              {confirmAction.action === 'resume' && 'Resume Subscription?'}
              {confirmAction.action === 'cancel' && 'Cancel Subscription?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.action === 'generate' && 
                `This will immediately create the next invoice for ${schedule?.customer_name}.`}
              {confirmAction.action === 'pause' && 
                'This will pause automatic invoice generation. You can resume at any time.'}
              {confirmAction.action === 'resume' && 
                'This will resume automatic invoice generation according to the schedule.'}
              {confirmAction.action === 'cancel' && 
                'This will permanently cancel this recurring billing schedule. This action cannot be undone. Historical invoices will remain accessible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={confirmAction.action === 'cancel' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction.action === 'generate' && 'Generate Invoice'}
              {confirmAction.action === 'pause' && 'Pause Subscription'}
              {confirmAction.action === 'resume' && 'Resume Subscription'}
              {confirmAction.action === 'cancel' && 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
