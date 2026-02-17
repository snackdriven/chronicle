import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import type { CellContext } from '@tanstack/react-table';
import { getRowId, type MemoryRowData } from '@/types/memory';

interface InlineEditCellProps<TData extends MemoryRowData> extends CellContext<TData, unknown> {
  field: string; // 'title' | 'namespace'
  validate?: (value: string) => string | null; // Returns error message or null if valid
}

/**
 * InlineEditCell - Click-to-edit cell component
 *
 * Features:
 * - Click to enter edit mode
 * - Auto-focus and select text on edit
 * - Enter to save, Escape to cancel
 * - Blur saves changes
 * - Loading state during save
 * - Validation with error messages
 * - Rollback on error or invalid input
 * - Type-safe for both TimelineEvent and KVMemory
 *
 * Usage:
 * {
 *   accessorKey: 'title',
 *   cell: (props) => <InlineEditCell {...props} field="title" validate={(val) => val.trim() ? null : 'Title is required'} />
 * }
 */
export function InlineEditCell<TData extends MemoryRowData>({
  getValue,
  row,
  table,
  field,
  validate,
}: InlineEditCellProps<TData>) {
  const rawValue = getValue();
  const initialValue = typeof rawValue === 'string' ? rawValue : '';
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset value if external data changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = async () => {
    // No changes, just exit edit mode
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    // Validate if validator provided
    if (validate) {
      const error = validate(value);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
    }

    // Don't save empty values
    if (!value.trim()) {
      setValue(initialValue); // Rollback
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Extract ID using type-safe helper (works for both TimelineEvent.id and KVMemory.key)
      const rowId = getRowId(row.original);
      await table.options.meta?.updateEvent(rowId, { [field]: value });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      setValue(initialValue); // Rollback
      alert(`Failed to save ${field}. Please try again.`);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue); // Rollback
    setValidationError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Only save on blur if we're not already saving
    if (!isSaving) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          className={`
            w-full px-2 py-1 text-sm border rounded
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${isSaving ? 'bg-gray-100 cursor-wait' : 'bg-white'}
            ${validationError ? 'border-red-500' : ''}
          `}
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {validationError && (
          <div className="absolute left-0 top-full mt-1 text-xs text-red-600">
            {validationError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer px-2 py-1 hover:bg-gray-50 rounded transition-colors"
      title={`Click to edit ${field}`}
    >
      <span className="text-sm">{value || '(empty)'}</span>
    </div>
  );
}
