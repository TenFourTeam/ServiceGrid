import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Plus, Trash2, Settings } from 'lucide-react';
import { usePhoneNumbers, useSearchPhoneNumbers, usePurchasePhoneNumber, useDeletePhoneNumber } from '@/hooks/usePhoneNumbers';
import { toast } from 'sonner';

export function PhoneNumberSettings() {
  const { phoneNumbers, isLoading } = usePhoneNumbers();
  const searchNumbers = useSearchPhoneNumbers();
  const purchaseNumber = usePurchasePhoneNumber();
  const deleteNumber = useDeletePhoneNumber();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [country, setCountry] = useState('US');
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);

  const handleSearch = async () => {
    try {
      const numbers = await searchNumbers.mutateAsync({ country, areaCode });
      setAvailableNumbers(numbers);
      
      if (numbers.length === 0) {
        toast.info('No numbers found for this area code. Try a different one.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to search numbers');
    }
  };

  const handlePurchase = async (phoneNumber: string) => {
    try {
      await purchaseNumber.mutateAsync(phoneNumber);
      setIsDialogOpen(false);
      setAvailableNumbers([]);
      setAreaCode('');
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (phoneNumberId: string) => {
    if (!confirm('Are you sure you want to delete this phone number? This cannot be undone.')) {
      return;
    }

    try {
      await deleteNumber.mutateAsync(phoneNumberId);
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone Numbers
        </CardTitle>
        <CardDescription>
          Manage your business phone numbers for voice and SMS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading phone numbers...
          </div>
        ) : phoneNumbers.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              No phone numbers yet. Purchase one to get started.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {phoneNumbers.map((number) => (
              <Card key={number.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{number.phoneNumber}</div>
                      {number.friendlyName && (
                        <div className="text-sm text-muted-foreground">{number.friendlyName}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={number.status === 'active' ? 'default' : 'secondary'}>
                      {number.status}
                    </Badge>
                    <Button variant="ghost" size="sm" disabled>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(number.id)}
                      disabled={deleteNumber.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Purchase New Number
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Phone Number</DialogTitle>
              <DialogDescription>
                Search for available phone numbers by area code
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Area Code (Optional)</Label>
                  <Input
                    placeholder="512"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    maxLength={3}
                  />
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={searchNumbers.isPending}
                className="w-full"
              >
                {searchNumbers.isPending ? 'Searching...' : 'Search Numbers'}
              </Button>

              {availableNumbers.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Numbers</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableNumbers.map((number) => (
                      <Card key={number.phoneNumber}>
                        <CardContent className="flex items-center justify-between p-3">
                          <div>
                            <div className="font-medium">{number.phoneNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {number.locality}, {number.region}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handlePurchase(number.phoneNumber)}
                            disabled={purchaseNumber.isPending}
                          >
                            {purchaseNumber.isPending ? 'Purchasing...' : 'Purchase'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
