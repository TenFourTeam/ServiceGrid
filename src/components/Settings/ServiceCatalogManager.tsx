import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Package } from 'lucide-react';
import { useServiceCatalog } from '@/hooks/useServiceCatalog';
import { ServiceCatalogTable } from './ServiceCatalogTable';
import { ServiceCatalogForm } from './ServiceCatalogForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ServiceCatalogItem } from '@/hooks/useServiceCatalog';

export function ServiceCatalogManager() {
  const { services, isLoading, createService, updateService, deleteService } = useServiceCatalog();
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);

  const handleEdit = (service: ServiceCatalogItem) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingService(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Service Catalog
              </CardTitle>
              <CardDescription className="mt-1.5">
                Manage your services and pricing for AI invoice estimation
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No services yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your services and pricing to enable AI-powered invoice estimation
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service
              </Button>
            </div>
          ) : (
            <ServiceCatalogTable
              services={services}
              onEdit={handleEdit}
              onDelete={(id) => deleteService.mutate(id)}
              onToggleActive={(id, isActive) =>
                updateService.mutate({ id, updates: { is_active: !isActive } })
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
          </DialogHeader>
          <ServiceCatalogForm
            service={editingService}
            onSubmit={async (data) => {
              if (editingService) {
                await updateService.mutateAsync({ id: editingService.id, updates: data });
              } else {
                await createService.mutateAsync(data);
              }
              handleCloseForm();
            }}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
