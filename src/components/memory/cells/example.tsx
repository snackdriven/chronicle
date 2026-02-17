/**
 * Example: How to use the memory manager cell components
 *
 * This file demonstrates proper integration of all cell components
 * with TanStack React Table v8.
 */

import { createColumnHelper } from '@tanstack/react-table';
import {
  InlineEditCell,
  BadgeCell,
  DateCell,
  ActionsCell,
} from './index';

// Example event type (matches memory server schema)
interface MemoryEvent {
  id: string;
  title: string;
  eventType: 'jira_ticket' | 'spotify_play' | 'calendar_event' | 'journal_entry' | 'github_commit';
  namespace: string;
  timestamp: string | number;
  data?: Record<string, unknown>;
}

// Create column helper for type safety
const columnHelper = createColumnHelper<MemoryEvent>();

// Define table columns with custom cells
export const memoryTableColumns = [
  // Editable title column
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (props) => <InlineEditCell {...props} field="title" />,
    size: 250,
  }),

  // Type badge column
  columnHelper.accessor('eventType', {
    header: 'Type',
    cell: (props) => <BadgeCell {...props} />,
    size: 150,
  }),

  // Editable namespace column
  columnHelper.accessor('namespace', {
    header: 'Namespace',
    cell: (props) => <InlineEditCell {...props} field="namespace" />,
    size: 150,
  }),

  // Formatted date column
  columnHelper.accessor('timestamp', {
    header: 'Date',
    cell: (props) => <DateCell {...props} />,
    size: 180,
  }),

  // Actions column (edit + delete)
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (props) => <ActionsCell {...props} />,
    size: 120,
  }),
];

// Example table meta implementation
export interface MemoryTableMeta {
  updateEvent: (id: string, updates: Partial<MemoryEvent>) => Promise<void>;
  openEditModal: (event: MemoryEvent) => void;
  deleteEvent: (id: string) => Promise<void>;
}

// Example usage in a component:
/*
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { memoryTableColumns, MemoryTableMeta } from './cells/example';

function MemoryTable() {
  const [data, setData] = useState<MemoryEvent[]>([]);

  const table = useReactTable({
    data,
    columns: memoryTableColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateEvent: async (id, updates) => {
        // API call to update event
        const response = await fetch(`/api/memory/events/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Update failed');

        // Update local state
        setData(prev => prev.map(event =>
          event.id === id ? { ...event, ...updates } : event
        ));
      },

      openEditModal: (event) => {
        // Open modal with event data
        setSelectedEvent(event);
        setModalOpen(true);
      },

      deleteEvent: async (id) => {
        // API call to delete event
        const response = await fetch(`/api/memory/events/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Delete failed');

        // Update local state
        setData(prev => prev.filter(event => event.id !== id));
      },
    } as MemoryTableMeta,
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
*/
