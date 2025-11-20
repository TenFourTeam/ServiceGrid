import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuickBooksEntityMappings } from '@/hooks/useQuickBooksEntityMappings';
import { Link2Off, Search } from 'lucide-react';
import { useState } from 'react';

export function QuickBooksEntityMappings() {
  const { mappings, unlinkEntity, isUnlinking } = useQuickBooksEntityMappings();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMappings = mappings.filter(m =>
    m.sg_entity_id.includes(searchTerm) ||
    m.qb_entity_id.includes(searchTerm) ||
    m.entity_type.includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity Mappings</CardTitle>
        <CardDescription>
          View and manage mappings between ServiceGrid and QuickBooks records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {['customer', 'invoice', 'payment', 'time_entry'].map(type => {
            const count = mappings.filter(m => m.entity_type === type).length;
            return (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{type}s</div>
              </div>
            );
          })}
        </div>

        {/* Mappings Table */}
        <div className="border rounded-lg">
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 p-3 border-b bg-muted/50 text-sm font-medium">
            <div>Type</div>
            <div>ServiceGrid ID</div>
            <div>QuickBooks ID</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          <div className="divide-y max-h-[400px] overflow-y-auto">
            {filteredMappings.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                {searchTerm ? 'No mappings match your search' : 'No entity mappings yet'}
              </p>
            ) : (
              filteredMappings.map((mapping) => (
                <div key={`${mapping.sg_entity_id}-${mapping.qb_entity_id}`} className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 p-3 items-center text-sm">
                  <Badge variant="outline" className="capitalize">
                    {mapping.entity_type}
                  </Badge>

                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {mapping.sg_entity_id.substring(0, 8)}...
                  </code>

                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {mapping.qb_entity_id}
                  </code>

                  <Badge 
                    variant={mapping.sync_status === 'synced' ? 'default' : 
                             mapping.sync_status === 'error' ? 'destructive' : 'secondary'}
                  >
                    {mapping.sync_status}
                  </Badge>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unlinkEntity({ 
                      sgEntityId: mapping.sg_entity_id, 
                      entityType: mapping.entity_type 
                    })}
                    disabled={isUnlinking}
                  >
                    <Link2Off className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
