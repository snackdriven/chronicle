import { useState } from 'react';
import type { CellContext } from '@tanstack/react-table';
import { Edit2, Trash2 } from 'lucide-react';
import { getRowId, type MemoryRowData } from '@/types/memory';
import { ConfirmDialog } from '../ConfirmDialog';

interface ActionsCellProps<TData extends MemoryRowData> extends CellContext<TData, unknown> {}

/**
 * ActionsCell - Edit and delete actions for table rows
 *
 * Features:
 * - Edit button (opens modal via table.options.meta.openEditModal)
 * - Delete button (with beautiful confirmation dialog)
 * - Loading state during delete operation
 * - Error handling for delete failures
 * - Type-safe for both TimelineEvent and KVMemory
 *
 * Usage:
 * {
 *   id: 'actions',
 *   cell: (props) => <ActionsCell {...props} />
 * }
 */
export function ActionsCell<TData extends MemoryRowData>({ row, table }: ActionsCellProps<TData>) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get display name for the item (title for Timeline, key for KV)
  const getItemName = () => {
    const item = row.original as any;
    return item.title || item.key || 'this item';
  };

  const handleEdit = () => {
    if (table.options.meta?.openEditModal) {
      table.options.meta.openEditModal(row.original);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      // Extract ID using type-safe helper (works for both TimelineEvent.id and KVMemory.key)
      const rowId = getRowId(row.original);
      await table.options.meta?.deleteEvent(rowId);
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to delete:', error);
      // Error is shown in the dialog, it will close and user can retry
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Edit Button */}
        <button
          onClick={handleEdit}
          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit event"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteClick}
          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete event"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Beautiful Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        description={`Are you sure you want to delete "${getItemName()}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
