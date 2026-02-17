import { useState } from 'react';
import type { CellContext } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';

interface DateCellProps<TData> extends CellContext<TData, unknown> {}

/**
 * DateCell - Format timestamps with relative time on hover
 *
 * Features:
 * - Formats timestamps as: yyyy-MM-dd HH:mm
 * - Supports both string (ISO) and number (Unix timestamp) formats
 * - Hover shows relative time (e.g., "2 hours ago")
 * - Handles invalid dates gracefully
 *
 * Usage:
 * {
 *   accessorKey: 'timestamp',
 *   cell: (props) => <DateCell {...props} />
 * }
 */
export function DateCell<TData>({ getValue }: DateCellProps<TData>) {
  const [showRelative, setShowRelative] = useState(false);
  const timestamp = getValue();

  // Convert timestamp to Date object
  const getDate = (): Date | null => {
    if (!timestamp) return null;

    try {
      // Handle Unix timestamp (number)
      if (typeof timestamp === 'number') {
        return new Date(timestamp);
      }

      // Handle ISO string
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }

      return null;
    } catch {
      return null;
    }
  };

  const date = getDate();

  // Invalid date handling
  if (!date || isNaN(date.getTime())) {
    return (
      <span className="text-sm text-gray-400" title="Invalid date">
        -
      </span>
    );
  }

  const formattedDate = format(date, 'yyyy-MM-dd HH:mm');
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowRelative(true)}
      onMouseLeave={() => setShowRelative(false)}
    >
      <span className="text-sm text-gray-700">{formattedDate}</span>

      {/* Tooltip with relative time */}
      {showRelative && (
        <div className="absolute z-10 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {relativeTime}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2" />
        </div>
      )}
    </div>
  );
}
