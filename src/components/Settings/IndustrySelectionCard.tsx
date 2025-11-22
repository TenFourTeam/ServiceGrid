import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Info, Sparkles, Loader2 } from 'lucide-react';
import { useIndustrySelection } from '@/hooks/useIndustrySelection';
import { getIndustryOptions, getIndustryLabel } from '@/utils/industrySOPs';

export function IndustrySelectionCard() {
  const { currentIndustry, populateSOPs, isPopulating } = useIndustrySelection();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const industryOptions = getIndustryOptions();

  // Sync with currentIndustry when it loads
  useEffect(() => {
    if (currentIndustry && typeof currentIndustry === 'string') {
      setSelectedIndustry(currentIndustry);
    }
  }, [currentIndustry]);

  const handlePopulateClick = () => {
    if (!selectedIndustry) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmPopulate = async () => {
    if (!selectedIndustry) return;
    await populateSOPs.mutateAsync(selectedIndustry);
    setShowConfirmDialog(false);
  };

  const hasIndustryChanged = selectedIndustry && selectedIndustry !== currentIndustry;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Industry & Service Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Your Industry</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose your industry..." />
              </SelectTrigger>
              <SelectContent>
                {industryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIndustry && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Selecting an industry will populate your Service Catalog with industry-specific 
                  Standard Operating Procedures (SOPs) that you can customize. These are professionally 
                  written best practices from experienced contractors in your field.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePopulateClick}
                disabled={isPopulating || !hasIndustryChanged}
                className="w-full"
                variant={currentIndustry ? 'outline' : 'default'}
              >
                {isPopulating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Populating SOPs...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {currentIndustry === selectedIndustry
                      ? 'Repopulate SOPs from ' + getIndustryLabel(selectedIndustry)
                      : 'Populate SOPs from ' + getIndustryLabel(selectedIndustry)}
                  </>
                )}
              </Button>

              {currentIndustry && currentIndustry === selectedIndustry && (
                <p className="text-xs text-muted-foreground text-center">
                  This will add any new best practices that aren't already in your catalog
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Populate Service Catalog?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will add industry-specific best practices to your Service Catalog for{' '}
                <strong>{selectedIndustry && getIndustryLabel(selectedIndustry)}</strong>.
              </p>
              <p>
                These SOPs will be added with $0.00 pricing. You can review and add pricing 
                in the Service Catalog section below.
              </p>
              <p className="text-sm text-muted-foreground">
                Note: This won't duplicate services that already exist in your catalog.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPopulate} disabled={isPopulating}>
              {isPopulating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Catalog'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
