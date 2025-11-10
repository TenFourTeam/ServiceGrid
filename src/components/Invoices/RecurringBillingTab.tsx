import { useState } from "react";
import { useRecurringSchedules, useGenerateNextInvoice, RecurringSchedule } from "@/hooks/useRecurringSchedules";
import { formatCurrency } from "@/utils/money";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, RefreshCw, ExternalLink, Calendar } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const frequencyColors: Record<string, string> = {
  Weekly: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Monthly: "bg-green-500/10 text-green-700 dark:text-green-300",
  Quarterly: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Yearly: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

export default function RecurringBillingTab() {
  const { data: schedules, isLoading, error } = useRecurringSchedules();
  const generateNextInvoice = useGenerateNextInvoice();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    schedule: RecurringSchedule | null;
  }>({ open: false, schedule: null });

  const handleGenerateNow = (schedule: RecurringSchedule) => {
    setConfirmDialog({ open: true, schedule });
  };

  const confirmGenerate = () => {
    if (confirmDialog.schedule) {
      generateNextInvoice.mutate(confirmDialog.schedule.id);
    }
    setConfirmDialog({ open: false, schedule: null });
  };

  const handleViewQuote = (quoteId: string) => {
    navigate(`/quotes?id=${quoteId}`);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load recurring schedules. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Recurring Billing Schedules</CardTitle>
          <CardDescription>
            When you create quotes with recurring billing enabled, they'll appear here with automatic invoice generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/quotes')}>Create Recurring Quote</Button>
        </CardContent>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{schedule.customer_name}</CardTitle>
                    <CardDescription>{schedule.customer_email}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleGenerateNow(schedule)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate Next Invoice Now
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewQuote(schedule.quote_id)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Original Quote
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Invoice</span>
                  <div className="text-right">
                    <div className="font-semibold text-primary">
                      {format(new Date(schedule.next_billing_date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      in {formatDistanceToNow(new Date(schedule.next_billing_date))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatCurrency(schedule.amount)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frequency</span>
                  <Badge variant="secondary" className={frequencyColors[schedule.frequency]}>
                    {schedule.frequency}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quote</span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0"
                    onClick={() => handleViewQuote(schedule.quote_id)}
                  >
                    {schedule.quote_number}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Generated</span>
                  <span>{schedule.total_invoices_generated} invoice{schedule.total_invoices_generated !== 1 ? 's' : ''}</span>
                </div>
                
                {schedule.last_invoice_date && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last Invoice</span>
                    <span>{format(new Date(schedule.last_invoice_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, schedule: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generate Next Invoice Now?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately create the next invoice for {confirmDialog.schedule?.customer_name} and schedule the following invoice for{' '}
                {confirmDialog.schedule && format(
                  new Date(new Date(confirmDialog.schedule.next_billing_date).getTime() + 
                    (confirmDialog.schedule.frequency === 'Weekly' ? 7 * 24 * 60 * 60 * 1000 :
                     confirmDialog.schedule.frequency === 'Monthly' ? 30 * 24 * 60 * 60 * 1000 :
                     confirmDialog.schedule.frequency === 'Quarterly' ? 90 * 24 * 60 * 60 * 1000 :
                     365 * 24 * 60 * 60 * 1000)),
                  'MMM d, yyyy'
                )}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmGenerate}>
                Generate Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recurring Billing Schedules</CardTitle>
          <CardDescription>
            Automatic invoice generation for recurring quotes. Next invoice dates are displayed below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Next Invoice</TableHead>
                <TableHead>Last Invoice</TableHead>
                <TableHead className="text-right">Generated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const nextDate = new Date(schedule.next_billing_date);
                const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isDueSoon = daysUntil <= 7;
                
                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{schedule.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{schedule.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0"
                        onClick={() => handleViewQuote(schedule.quote_id)}
                      >
                        {schedule.quote_number}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={frequencyColors[schedule.frequency]}>
                        {schedule.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(schedule.amount)}
                    </TableCell>
                    <TableCell>
                      <div className={isDueSoon ? "font-semibold text-primary" : ""}>
                        <div className="flex items-center gap-2">
                          {isDueSoon && <Calendar className="h-4 w-4" />}
                          {format(nextDate, 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          in {formatDistanceToNow(nextDate)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.last_invoice_date ? (
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(schedule.last_invoice_date), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {schedule.total_invoices_generated}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleGenerateNow(schedule)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Generate Next Invoice Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewQuote(schedule.quote_id)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Original Quote
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, schedule: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Next Invoice Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately create the next invoice for {confirmDialog.schedule?.customer_name} and schedule the following invoice for{' '}
              {confirmDialog.schedule && format(
                new Date(new Date(confirmDialog.schedule.next_billing_date).getTime() + 
                  (confirmDialog.schedule.frequency === 'Weekly' ? 7 * 24 * 60 * 60 * 1000 :
                   confirmDialog.schedule.frequency === 'Monthly' ? 30 * 24 * 60 * 60 * 1000 :
                   confirmDialog.schedule.frequency === 'Quarterly' ? 90 * 24 * 60 * 60 * 1000 :
                   365 * 24 * 60 * 60 * 1000)),
                'MMM d, yyyy'
              )}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>
              Generate Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}