import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';

const SETUP_STEPS = [
  {
    title: 'Create QuickBooks Developer Account',
    description: 'Sign up for a QuickBooks Developer account to access API credentials',
    link: 'https://developer.intuit.com',
    linkText: 'Go to QuickBooks Developer Portal',
  },
  {
    title: 'Create an App',
    description: 'Create a new app in the QuickBooks Developer Portal and configure OAuth settings',
    link: 'https://developer.intuit.com/app/developer/myapps',
    linkText: 'Create App',
  },
  {
    title: 'Copy API Credentials',
    description: 'Copy your Client ID and Client Secret from the app settings',
    link: null,
  },
  {
    title: 'Add Credentials to Supabase',
    description: 'Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET as edge function secrets',
    link: `https://supabase.com/dashboard/project/ijudkzqfriazabiosnvb/settings/functions`,
    linkText: 'Open Secrets Manager',
  },
  {
    title: 'Connect to QuickBooks',
    description: 'Return to the Connection tab and click "Connect to QuickBooks"',
    link: null,
  },
  {
    title: 'Configure Field Mappings',
    description: 'Review and customize field mappings in the Field Mappings tab',
    link: null,
  },
  {
    title: 'Run Initial Sync',
    description: 'Perform your first sync to import existing QuickBooks data',
    link: null,
  },
  {
    title: 'Enable Automation',
    description: 'Set up automatic sync schedules for ongoing synchronization',
    link: null,
  },
];

export function QuickBooksSetupGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Guide</CardTitle>
        <CardDescription>
          Follow these steps to complete your QuickBooks integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {SETUP_STEPS.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex-shrink-0 mt-1">
                <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.link && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    asChild
                  >
                    <a href={step.link} target="_blank" rel="noopener noreferrer">
                      {step.linkText}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Need Help?</h4>
          <p className="text-sm text-muted-foreground">
            Check out the QuickBooks integration documentation or contact support if you encounter any issues during setup.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
