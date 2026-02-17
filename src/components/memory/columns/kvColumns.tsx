import type { ColumnDef } from '@tanstack/react-table';
import type { KVMemory } from '@/types/memory';
import { Checkbox } from '@/components/ui/Checkbox';
import { ActionsCell } from '@/components/memory/cells';
import { Clock } from 'lucide-react';

/**
 * Column definitions for KV Memories table
 */
export const kvColumns: ColumnDef<KVMemory>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label={`Select row ${row.id}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ getValue }) => {
      const key = getValue() as string;
      return (
        <span className="font-mono text-sm text-foreground">
          {key}
        </span>
      );
    },
    size: 250,
  },
  {
    accessorKey: 'value',
    header: 'Value',
    cell: ({ getValue }) => {
      const value = getValue();
      const stringValue = typeof value === 'string'
        ? value
        : JSON.stringify(value);
      const truncated = stringValue.length > 100
        ? stringValue.slice(0, 100) + '...'
        : stringValue;

      return (
        <span className="font-mono text-xs text-muted-foreground truncate max-w-md block">
          {truncated}
        </span>
      );
    },
    size: 300,
    enableSorting: false,
  },
  {
    accessorKey: 'namespace',
    header: 'Namespace',
    cell: ({ getValue }) => {
      const namespace = getValue() as string | undefined;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
          {namespace || 'default'}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'ttl',
    header: 'TTL',
    cell: ({ getValue }) => {
      const ttl = getValue() as number | undefined;

      if (ttl === undefined) {
        return (
          <span className="text-xs text-muted-foreground italic">
            Never expires
          </span>
        );
      }

      const minutes = Math.floor(ttl / 60);
      const seconds = ttl % 60;

      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{minutes}m {seconds}s</span>
        </div>
      );
    },
    size: 120,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: (props) => <ActionsCell {...props} />,
    enableSorting: false,
    size: 120,
  },
];
