import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Power } from 'lucide-react';
import { formatMoney } from '@/utils/format';
import type { ServiceCatalogItem } from '@/hooks/useServiceCatalog';

interface ServiceCatalogTableProps {
  services: ServiceCatalogItem[];
  onEdit: (service: ServiceCatalogItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
}

export function ServiceCatalogTable({ services, onEdit, onDelete, onToggleActive }: ServiceCatalogTableProps) {
  // Group by category
  const grouped = services.reduce((acc, service) => {
    const cat = service.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, ServiceCatalogItem[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">{category}</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((service) => (
                  <TableRow key={service.id} className={!service.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.service_name}</div>
                        {service.description && (
                          <div className="text-sm text-muted-foreground">{service.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(service.unit_price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {service.unit_type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? 'default' : 'secondary'}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleActive(service.id, service.is_active)}
                          title={service.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this service?')) {
                              onDelete(service.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
