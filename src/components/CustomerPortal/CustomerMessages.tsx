import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Construction } from 'lucide-react';

export function CustomerMessages() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Messages</h2>
        <p className="text-muted-foreground">
          Communicate with your contractor
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <MessageSquare className="h-16 w-16 text-muted-foreground" />
              <Construction className="h-6 w-6 text-orange-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            The messaging feature is currently under development. 
            Soon you'll be able to communicate directly with your contractor here.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            In the meantime, please contact your contractor using the phone number or email 
            shown on your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
