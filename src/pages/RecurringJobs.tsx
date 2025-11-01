import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecurringJobTemplates } from '@/hooks/useRecurringJobs';
import { RecurringJobsList } from '@/components/RecurringJobs/RecurringJobsList';
import { RecurringJobModal } from '@/components/RecurringJobs/RecurringJobModal';

export default function RecurringJobs() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: templates, isLoading } = useRecurringJobTemplates();

  return (
    <AppLayout title={t('recurring.title', 'Recurring Jobs')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('recurring.title', 'Recurring Jobs')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('recurring.subtitle', 'Automate recurring service schedules')}
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('recurring.create', 'New Template')}
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('recurring.templates', 'Job Templates')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringJobsList
                templates={templates || []}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <RecurringJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </AppLayout>
  );
}
