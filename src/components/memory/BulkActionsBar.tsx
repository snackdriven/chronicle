/**
 * Bulk Actions Bar Component
 *
 * Fixed bottom bar that appears when items are selected, providing bulk operations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, Copy, X, FileJson, FileSpreadsheet } from 'lucide-react';
import type { TimelineEvent, KVMemory } from '@/types/memory';
import { exportToCSV, exportToJSON, copyToClipboard } from '@/lib/export/exportFunctions';

export interface BulkActionsBarProps {
  /** Number of selected items */
  selectedCount: number;

  /** Selected items */
  selectedItems: TimelineEvent[] | KVMemory[];

  /** Type of data being managed */
  type: 'timeline' | 'kv';

  /** Callback when delete button clicked */
  onDelete: () => void;

  /** Callback when clear selection clicked */
  onClearSelection: () => void;

  /** Loading state for delete operation */
  isDeleting?: boolean;
}

/**
 * Bulk Actions Bar
 *
 * Displays fixed bar at bottom of screen when items are selected
 */
export function BulkActionsBar({
  selectedCount,
  selectedItems,
  type,
  onDelete,
  onClearSelection,
  isDeleting = false,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  /**
   * Handle export to CSV
   */
  const handleExportCSV = () => {
    try {
      exportToCSV(selectedItems, type);
      setExportStatus('Exported to CSV');
      setTimeout(() => setExportStatus(null), 2000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('Export failed');
      setTimeout(() => setExportStatus(null), 2000);
    }
  };

  /**
   * Handle export to JSON
   */
  const handleExportJSON = () => {
    try {
      exportToJSON(selectedItems, type);
      setExportStatus('Exported to JSON');
      setTimeout(() => setExportStatus(null), 2000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('Export failed');
      setTimeout(() => setExportStatus(null), 2000);
    }
  };

  /**
   * Handle copy to clipboard
   */
  const handleCopyToClipboard = async () => {
    try {
      await copyToClipboard(selectedItems, type);
      setExportStatus('Copied to clipboard');
      setTimeout(() => setExportStatus(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setExportStatus('Copy failed');
      setTimeout(() => setExportStatus(null), 2000);
    }
  };

  /**
   * Handle delete with confirmation
   */
  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowDeleteConfirm(false), 5000);
    } else {
      onDelete();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Left: Selection count */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClearSelection}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title="Clear selection"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Export status */}
              <AnimatePresence>
                {exportStatus && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    {exportStatus}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Export buttons */}
              <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Copy to clipboard (TSV)"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Export as CSV"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Export as JSON"
              >
                <FileJson className="h-4 w-4" />
                <span className="hidden sm:inline">JSON</span>
              </button>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white ${
                  showDeleteConfirm
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
                title={showDeleteConfirm ? 'Click again to confirm' : 'Delete selected items'}
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {isDeleting
                    ? 'Deleting...'
                    : showDeleteConfirm
                    ? 'Confirm Delete'
                    : 'Delete'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
