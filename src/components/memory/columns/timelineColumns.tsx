import type { ColumnDef } from '@tanstack/react-table';
import type { TimelineEvent } from '@/types/memory';
import { Checkbox } from '@/components/ui/Checkbox';
import { InlineEditCell, BadgeCell, DateCell, ActionsCell } from '@/components/memory/cells';

/**
 * Column definitions for Timeline Events table
 */
export const timelineColumns: ColumnDef<TimelineEvent>[] = [
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
    accessorKey: 'type',
    header: 'Type',
    cell: (props) => <BadgeCell<TimelineEvent> {...props} />,
    size: 120,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: (props) => <InlineEditCell<TimelineEvent> {...props} field="title" />,
    size: 300,
  },
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    cell: (props) => <DateCell<TimelineEvent> {...props} />,
    size: 150,
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'namespace',
    header: 'Namespace',
    cell: (props) => <InlineEditCell<TimelineEvent> {...props} field="namespace" />,
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
