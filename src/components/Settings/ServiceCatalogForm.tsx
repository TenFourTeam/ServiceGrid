import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyInputNoSymbol, parseCurrencyInput, sanitizeMoneyTyping } from '@/utils/format';
import type { ServiceCatalogItem, CreateServiceInput } from '@/hooks/useServiceCatalog';

interface ServiceCatalogFormProps {
  service?: ServiceCatalogItem | null;
  onSubmit: (data: CreateServiceInput) => void;
  onCancel: () => void;
}

const UNIT_TYPES = [
  { value: 'per_job', label: 'Per Job' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_sqft', label: 'Per Square Foot' },
  { value: 'per_linear_ft', label: 'Per Linear Foot' },
  { value: 'per_unit', label: 'Per Unit' },
];

const CATEGORIES = [
  'Mowing',
  'Trimming',
  'Edging',
  'Cleanup',
  'Fertilization',
  'Landscaping',
  'Maintenance',
  'Other',
];

export function ServiceCatalogForm({ service, onSubmit, onCancel }: ServiceCatalogFormProps) {
  const [serviceName, setServiceName] = useState(service?.service_name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [priceInput, setPriceInput] = useState(
    service ? formatCurrencyInputNoSymbol(service.unit_price) : '0.00'
  );
  const [unitType, setUnitType] = useState(service?.unit_type || 'per_job');
  const [category, setCategory] = useState(service?.category || '');

  useEffect(() => {
    if (service) {
      setServiceName(service.service_name);
      setDescription(service.description || '');
      setPriceInput(formatCurrencyInputNoSymbol(service.unit_price));
      setUnitType(service.unit_type);
      setCategory(service.category || '');
    }
  }, [service]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    const unitPrice = parseCurrencyInput(priceInput);
    
    onSubmit({
      service_name: serviceName.trim(),
      description: description.trim() || undefined,
      unit_price: unitPrice,
      unit_type: unitType,
      category: category || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="serviceName">Service Name *</Label>
        <Input
          id="serviceName"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="e.g., Lawn Mowing - Standard"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this service"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="price"
              value={priceInput}
              onChange={(e) => setPriceInput(sanitizeMoneyTyping(e.target.value))}
              className="pl-7"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="unitType">Unit Type *</Label>
          <Select value={unitType} onValueChange={setUnitType}>
            <SelectTrigger id="unitType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {service ? 'Update Service' : 'Add Service'}
        </Button>
      </div>
    </form>
  );
}
