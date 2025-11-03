import { useState } from 'react';
import { Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory, useInventoryOperations, type InventoryItem } from '@/hooks/useInventory';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { InventoryItemCard } from './InventoryItemCard';
import { InventoryItemModal } from './InventoryItemModal';
import { InventoryTransactionModal } from './InventoryTransactionModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function InventoryManagement() {
  const { business, profileId } = useBusinessContext();
  const { data: items = [], isLoading } = useInventory(business?.id);
  const { createItem, updateItem, deleteItem, logTransaction } = useInventoryOperations();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | undefined>();
  const [transactionType, setTransactionType] = useState<'usage' | 'restock'>('usage');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | undefined>();

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && item.min_quantity && item.current_quantity <= item.min_quantity) ||
                        (stockFilter === 'out' && item.current_quantity === 0);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

  const handleSaveItem = async (data: any) => {
    if (!business?.id || !profileId) return;

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, business_id: business.id, ...data });
    } else {
      await createItem.mutateAsync({ ...data, business_id: business.id, owner_id: profileId, is_active: true });
    }
    
    setItemModalOpen(false);
    setEditingItem(undefined);
  };

  const handleTransaction = (quantity: number, notes?: string) => {
    if (!business?.id || !transactionItem) return;

    const adjustedQuantity = transactionType === 'usage' ? -quantity : quantity;

    logTransaction.mutate({
      business_id: business.id,
      inventory_item_id: transactionItem.id,
      transaction_type: transactionType,
      quantity: adjustedQuantity,
      user_id: profileId as string,
      notes,
      transaction_date: new Date().toISOString(),
    });
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete && business?.id) {
      deleteItem.mutate({ id: itemToDelete, business_id: business.id });
      setItemToDelete(undefined);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {items.length === 0 ? 'No Inventory Items Yet' : 'No items match your filters'}
          </h3>
          <p className="text-muted-foreground">
            {items.length === 0 ? 'Start tracking your supplies and equipment' : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onEdit={(item) => {
                setEditingItem(item);
                setItemModalOpen(true);
              }}
              onUse={(item) => {
                setTransactionItem(item);
                setTransactionType('usage');
                setTransactionModalOpen(true);
              }}
              onRestock={(item) => {
                setTransactionItem(item);
                setTransactionType('restock');
                setTransactionModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <InventoryItemModal
        item={editingItem}
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(undefined);
        }}
        onSave={handleSaveItem}
        isLoading={createItem.isPending || updateItem.isPending}
      />

      {transactionItem && (
        <InventoryTransactionModal
          item={transactionItem}
          type={transactionType}
          open={transactionModalOpen}
          onClose={() => {
            setTransactionModalOpen(false);
            setTransactionItem(undefined);
          }}
          onSave={handleTransaction}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
