import { useState, useRef } from 'react';
import type { ColumnDef, SortingState, RowSelectionState } from '@tanstack/react-table';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableToolbar } from './TableToolbar';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export interface MemoryTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  onAddNew: () => void;
  addButtonLabel?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  meta?: {
    openEditModal: (item: TData) => void;
    deleteEvent: (id: string) => Promise<void>;
    updateEvent: (id: string, data: any) => Promise<void>;
  };
}

/**
 * Core table component with virtual scrolling, sorting, and row selection
 *
 * Features:
 * - TanStack Table for table logic
 * - Virtual scrolling for performance with 1000+ rows
 * - Sortable columns
 * - Row selection with checkboxes
 * - Global search filter
 */
export function MemoryTable<TData>({
  data,
  columns,
  onAddNew,
  addButtonLabel = 'Add New',
  emptyMessage = 'No data available',
  isLoading = false,
  meta,
}: MemoryTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Table instance
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    meta,
  });

  // Virtual scrolling setup
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52, // Estimated row height in pixels
    overscan: 10, // Number of rows to render outside visible area
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  // Selected count
  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <TableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        selectedCount={selectedCount}
        totalCount={rows.length}
        onAddNew={onAddNew}
        addButtonLabel={addButtonLabel}
      />

      {/* Table Container with Virtual Scrolling */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto"
        style={{ height: '600px' }}
      >
        {isLoading ? (
          // Loading state
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading data...</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={clsx(
                        'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border',
                        header.column.getCanSort() && 'cursor-pointer select-none hover:bg-muted/80'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="flex flex-col">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <div className="w-4 h-4 opacity-0 group-hover:opacity-50">
                                <ChevronUp className="w-4 h-2" />
                                <ChevronDown className="w-4 h-2" />
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Table Body with Virtual Rows */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      'border-b border-border hover:bg-muted/50 transition-colors',
                      row.getIsSelected() && 'bg-primary/5'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with row count */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        Showing {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        {globalFilter && ` (filtered from ${data.length} total)`}
      </div>
    </div>
  );
}
