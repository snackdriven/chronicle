import { Search, Plus } from 'lucide-react';

export interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCount: number;
  totalCount: number;
  onAddNew: () => void;
  addButtonLabel?: string;
}

/**
 * Toolbar component for memory tables
 * Includes search input, selected count, and add new button
 */
export function TableToolbar({
  searchValue,
  onSearchChange,
  selectedCount,
  totalCount,
  onAddNew,
  addButtonLabel = 'Add New',
}: TableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
      {/* Search Input */}
      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>

      {/* Selected Count Display */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm font-medium">
          <span>{selectedCount} selected</span>
          <span className="text-xs text-muted-foreground">of {totalCount}</span>
        </div>
      )}

      {/* Add New Button */}
      <button
        onClick={onAddNew}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
      >
        <Plus className="w-4 h-4" />
        {addButtonLabel}
      </button>
    </div>
  );
}
