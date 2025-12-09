import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, CreditCard, Calendar, ChevronRight } from 'lucide-react';
import type { ActionItems } from '@/types/customerPortal';

interface ActionItemsWidgetProps {
  items: ActionItems;
  onViewQuotes?: () => void;
  onViewInvoices?: () => void;
  onViewSchedule?: () => void;
}

export function ActionItemsWidget({ 
  items, 
  onViewQuotes, 
  onViewInvoices, 
  onViewSchedule 
}: ActionItemsWidgetProps) {
  const totalActions = items.pendingQuotes + items.unpaidInvoices;
  
  if (totalActions === 0 && items.upcomingAppointments === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You're all caught up! No pending actions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          Action Items
          {totalActions > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalActions}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.pendingQuotes > 0 && (
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-3"
            onClick={onViewQuotes}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">{items.pendingQuotes} quote{items.pendingQuotes > 1 ? 's' : ''} to review</p>
                <p className="text-xs text-muted-foreground">Review and approve</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}

        {items.unpaidInvoices > 0 && (
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-3"
            onClick={onViewInvoices}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <CreditCard className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">{items.unpaidInvoices} invoice{items.unpaidInvoices > 1 ? 's' : ''} to pay</p>
                <p className="text-xs text-muted-foreground">Complete payment</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}

        {items.upcomingAppointments > 0 && (
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-3"
            onClick={onViewSchedule}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">{items.upcomingAppointments} upcoming appointment{items.upcomingAppointments > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">View schedule</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
