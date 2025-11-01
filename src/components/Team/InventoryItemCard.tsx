import { Package, Edit, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatDistanceToNow } from 'date-fns';

interface InventoryItemCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onUse: (item: InventoryItem) => void;
  onRestock: (item: InventoryItem) => void;
}

export function InventoryItemCard({ item, onEdit, onUse, onRestock }: InventoryItemCardProps) {
  const isLowStock = item.min_quantity && item.current_quantity <= item.min_quantity;
  const isWarning = item.min_quantity && item.current_quantity <= item.min_quantity * 1.2;
  const stockPercentage = item.max_quantity 
    ? (item.current_quantity / item.max_quantity) * 100 
    : undefined;

  const getStockStatus = () => {
    if (item.current_quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (isLowStock) return { label: 'Low Stock', variant: 'destructive' as const };
    if (isWarning) return { label: 'Warning', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  const status = getStockStatus();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 w-full">
            <div className="p-3 rounded-lg bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {item.sku && (
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {item.current_quantity} {item.unit_type}
                  </span>
                </div>
                {item.category && (
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <span className="ml-2 font-medium text-foreground">{item.category}</span>
                  </div>
                )}
                {item.location && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-2 font-medium text-foreground">{item.location}</span>
                  </div>
                )}
                {item.last_restocked_at && (
                  <div>
                    <span className="text-muted-foreground">Last Restocked:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {formatDistanceToNow(new Date(item.last_restocked_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              {stockPercentage !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className="text-muted-foreground">
                      {item.current_quantity} / {item.max_quantity} {item.unit_type}
                    </span>
                  </div>
                  <Progress 
                    value={stockPercentage} 
                    className="h-2"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto justify-end md:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
              className="flex-1 md:flex-none"
            >
              <Edit className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUse(item)}
              className="flex-1 md:flex-none"
            >
              <TrendingDown className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">Use</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestock(item)}
              className="flex-1 md:flex-none"
            >
              <TrendingUp className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">Restock</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
