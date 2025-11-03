import { useState } from 'react';
import { Sparkles, Calendar, Users, TrendingUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useAIActivityLog } from '@/hooks/useAIActivityLog';
import { format } from 'date-fns';

/**
 * Floating "Ask AI" button - context-aware AI assistant access point
 * Appears on all pages with relevant quick actions based on current route
 */
export function AskAIButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { recentActivity } = useAIActivityLog();

  // Determine context-specific content based on current route
  const getContextContent = () => {
    const path = location.pathname;

    if (path.includes('/calendar')) {
      return {
        title: 'AI Calendar Assistant',
        description: 'Get AI-powered scheduling suggestions and optimizations',
        actions: [
          { icon: Calendar, label: 'Optimize this week', onClick: () => console.log('Optimize week') },
          { icon: TrendingUp, label: 'Check capacity', onClick: () => navigate('/analytics') },
          { icon: FileText, label: 'View suggestions', onClick: () => console.log('View suggestions') },
        ],
      };
    }

    if (path.includes('/work-orders') || path.includes('/jobs')) {
      return {
        title: 'AI Job Assistant',
        description: 'Schedule pending jobs automatically',
        actions: [
          { icon: Calendar, label: 'Auto-schedule pending', onClick: () => console.log('Auto-schedule') },
          { icon: TrendingUp, label: 'Optimize routes', onClick: () => navigate('/recurring-jobs') },
          { icon: FileText, label: 'Job insights', onClick: () => navigate('/analytics') },
        ],
      };
    }

    if (path.includes('/team')) {
      return {
        title: 'AI Team Assistant',
        description: 'Check availability and workload distribution',
        actions: [
          { icon: Users, label: 'Check availability', onClick: () => console.log('Check availability') },
          { icon: TrendingUp, label: 'Team utilization', onClick: () => navigate('/analytics') },
          { icon: Calendar, label: 'Balance workload', onClick: () => console.log('Balance workload') },
        ],
      };
    }

    if (path.includes('/analytics')) {
      return {
        title: 'AI Analytics Assistant',
        description: 'Get predictive insights and recommendations',
        actions: [
          { icon: TrendingUp, label: 'Predictive insights', onClick: () => console.log('Predictions') },
          { icon: Calendar, label: 'Capacity forecast', onClick: () => console.log('Forecast') },
          { icon: FileText, label: 'AI recommendations', onClick: () => console.log('Recommendations') },
        ],
      };
    }

    // Default context
    return {
      title: 'AI Assistant',
      description: 'How can AI help you today?',
      actions: [
        { icon: Calendar, label: 'Optimize schedule', onClick: () => navigate('/calendar') },
        { icon: TrendingUp, label: 'View analytics', onClick: () => navigate('/analytics') },
        { icon: Users, label: 'Team insights', onClick: () => navigate('/team') },
      ],
    };
  };

  const contextContent = getContextContent();
  const recentActivities = recentActivity.slice(0, 3);

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all ai-button z-50"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {contextContent.title}
            </DialogTitle>
            <DialogDescription>{contextContent.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Quick Actions</h4>
              <div className="grid gap-2">
                {contextContent.actions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      action.onClick();
                      setOpen(false);
                    }}
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recent AI Activity */}
            {recentActivities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent AI Activity</h4>
                <div className="space-y-2">
                  {recentActivities.map((activity) => (
                    <Card key={activity.id} className="border-purple-100 dark:border-purple-900">
                      <CardContent className="p-3">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Coming Soon: Natural Language Input */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                💡 Coming soon: Ask questions in natural language
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
