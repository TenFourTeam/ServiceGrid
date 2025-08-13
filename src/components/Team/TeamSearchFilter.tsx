import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

// Sentinel constants to avoid empty string values in Radix Select
const ALL_ROLES = "all-roles" as const;
const ALL_STATUS = "all-status" as const;

type Role = "owner" | "worker";
type Status = "active" | "pending" | "inactive";

const normalizeRole = (value: string): Role | null =>
  value === ALL_ROLES ? null : (value as Role);

const normalizeStatus = (value: string): Status | null =>
  value === ALL_STATUS ? null : (value as Status);

interface TeamSearchFilterProps {
  onSearch: (query: string) => void;
  onFilterRole: (role: string | null) => void;
  onFilterStatus: (status: string | null) => void;
  activeFilters: {
    search: string;
    role: string | null;
    status: string | null;
  };
}

export function TeamSearchFilter({ 
  onSearch, 
  onFilterRole, 
  onFilterStatus, 
  activeFilters 
}: TeamSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState(activeFilters.search);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    onSearch("");
    onFilterRole(null);
    onFilterStatus(null);
  };

  const hasActiveFilters = activeFilters.search || activeFilters.role || activeFilters.status;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>

        <Select 
          value={activeFilters.role ?? ALL_ROLES} 
          onValueChange={(value) => onFilterRole(normalizeRole(value))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES}>All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="worker">Worker</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={activeFilters.status ?? ALL_STATUS} 
          onValueChange={(value) => onFilterStatus(normalizeStatus(value))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {activeFilters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {activeFilters.search}
              <button
                onClick={() => handleSearchChange("")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilters.role && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Role: {activeFilters.role}
              <button
                onClick={() => onFilterRole(null)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {activeFilters.status}
              <button
                onClick={() => onFilterStatus(null)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
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