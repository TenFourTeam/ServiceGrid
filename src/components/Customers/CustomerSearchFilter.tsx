import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface CustomerSearchFilterProps {
  onSearch: (query: string) => void;
  onQualificationFilter?: (filter: 'all' | 'qualified' | 'unqualified') => void;
  activeFilters: {
    search?: string;
    qualification?: 'all' | 'qualified' | 'unqualified';
  };
}

export function CustomerSearchFilter({
  onSearch,
  onQualificationFilter,
  activeFilters,
}: CustomerSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState(activeFilters.search || "");
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'qualified' | 'unqualified'>(activeFilters.qualification || 'all');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Call onSearch when debounced value changes
  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleQualificationChange = (value: 'all' | 'qualified' | 'unqualified') => {
    setQualificationFilter(value);
    onQualificationFilter?.(value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setQualificationFilter('all');
    onSearch("");
    onQualificationFilter?.('all');
  };

  const hasActiveFilters = activeFilters.search || (activeFilters.qualification && activeFilters.qualification !== 'all');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>
        
        {onQualificationFilter && (
          <Select value={qualificationFilter} onValueChange={handleQualificationChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="unqualified">Unqualified</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            Clear
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{activeFilters.search}"
              <button
                onClick={() => {
                  setSearchQuery("");
                  onSearch("");
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilters.qualification && activeFilters.qualification !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {activeFilters.qualification === 'qualified' ? 'Qualified' : 'Unqualified'}
              <button
                onClick={() => {
                  setQualificationFilter('all');
                  onQualificationFilter?.('all');
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}