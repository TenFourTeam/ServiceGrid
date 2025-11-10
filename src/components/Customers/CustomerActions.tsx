import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Customer } from '@/types';
import { useState } from 'react';

interface CustomerActionsProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerActions({ customer, onEdit, onDelete }: CustomerActionsProps) {
  const { t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border z-50">
        <DropdownMenuItem 
          onClick={(e) => { 
            e.stopPropagation(); 
            setDropdownOpen(false);
            setTimeout(() => onEdit(customer), 50);
          }} 
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          {t('customers.actions.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => { 
            e.stopPropagation(); 
            setDropdownOpen(false);
            setTimeout(() => onDelete(customer), 50);
          }} 
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t('customers.actions.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}