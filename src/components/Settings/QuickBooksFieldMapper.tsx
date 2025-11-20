import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuickBooksFieldMappings } from '@/hooks/useQuickBooksFieldMappings';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const ENTITY_TYPES = ['customer', 'invoice', 'payment'];

const DEFAULT_MAPPINGS = {
  customer: [
    { sg_field: 'name', qb_field: 'DisplayName' },
    { sg_field: 'email', qb_field: 'PrimaryEmailAddr.Address' },
    { sg_field: 'phone', qb_field: 'PrimaryPhone.FreeFormNumber' },
    { sg_field: 'address', qb_field: 'BillAddr.Line1' },
  ],
  invoice: [
    { sg_field: 'number', qb_field: 'DocNumber' },
    { sg_field: 'total', qb_field: 'TotalAmt' },
    { sg_field: 'created_at', qb_field: 'TxnDate' },
    { sg_field: 'due_at', qb_field: 'DueDate' },
  ],
  payment: [
    { sg_field: 'amount', qb_field: 'TotalAmt' },
    { sg_field: 'received_at', qb_field: 'TxnDate' },
    { sg_field: 'method', qb_field: 'PaymentMethodRef.name' },
  ],
};

export function QuickBooksFieldMapper() {
  const { mappings, createMapping, deleteMapping, isCreating, isDeleting } = useQuickBooksFieldMappings();
  const [selectedEntityType, setSelectedEntityType] = useState('customer');
  const [newMapping, setNewMapping] = useState({ sg_field: '', qb_field: '' });

  const entityMappings = mappings.filter(m => m.entity_type === selectedEntityType);

  const handleAddMapping = () => {
    if (newMapping.sg_field && newMapping.qb_field) {
      createMapping({
        entity_type: selectedEntityType,
        sg_field: newMapping.sg_field,
        qb_field: newMapping.qb_field,
        is_required: false,
      });
      setNewMapping({ sg_field: '', qb_field: '' });
    }
  };

  const handleLoadDefaults = () => {
    const defaults = DEFAULT_MAPPINGS[selectedEntityType as keyof typeof DEFAULT_MAPPINGS];
    defaults.forEach(mapping => {
      if (!entityMappings.find(m => m.sg_field === mapping.sg_field)) {
        createMapping({
          entity_type: selectedEntityType,
          ...mapping,
          is_required: false,
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Mappings</CardTitle>
        <CardDescription>
          Configure how ServiceGrid fields map to QuickBooks fields
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedEntityType} onValueChange={setSelectedEntityType}>
          <TabsList>
            {ENTITY_TYPES.map(type => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type}s
              </TabsTrigger>
            ))}
          </TabsList>

          {ENTITY_TYPES.map(type => (
            <TabsContent key={type} value={type} className="space-y-4">
              {/* Existing Mappings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Current Mappings</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadDefaults}
                    disabled={isCreating}
                  >
                    Load Defaults
                  </Button>
                </div>

                {entityMappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No mappings configured. Add mappings below or load defaults.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entityMappings.map((mapping) => (
                      <div key={mapping.id} className="flex items-center gap-2 p-2 border rounded">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground">ServiceGrid</span>
                            <p className="text-sm font-mono">{mapping.sg_field}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">QuickBooks</span>
                            <p className="text-sm font-mono">{mapping.qb_field}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMapping(mapping.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Mapping */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium">Add Custom Mapping</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="sg_field">ServiceGrid Field</Label>
                    <Input
                      id="sg_field"
                      placeholder="e.g., custom_field_1"
                      value={newMapping.sg_field}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, sg_field: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="qb_field">QuickBooks Field</Label>
                    <Input
                      id="qb_field"
                      placeholder="e.g., CustomField1"
                      value={newMapping.qb_field}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, qb_field: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddMapping}
                  disabled={!newMapping.sg_field || !newMapping.qb_field || isCreating}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
