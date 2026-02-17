/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcuts for common actions in the Memory Manager
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutsConfig {
  /** Focus search input (Cmd/Ctrl+K) */
  onSearch?: () => void;

  /** Open new item modal (Cmd/Ctrl+N) */
  onNew?: () => void;

  /** Delete selected items (Delete/Backspace) */
  onDelete?: () => void;

  /** Close modal/clear selection (Escape) */
  onClose?: () => void;

  /** Refresh data (Cmd/Ctrl+R) */
  onRefresh?: () => void;

  /** Toggle between tabs (Cmd/Ctrl+T) */
  onToggleTab?: () => void;

  /** Select all items (Cmd/Ctrl+A) */
  onSelectAll?: () => void;

  /** Disabled state (prevents shortcuts from firing) */
  disabled?: boolean;
}

/**
 * Check if element is an input field
 */
function isInputElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const isEditable =
    element.isContentEditable ||
    (element as HTMLInputElement).type === 'text' ||
    (element as HTMLInputElement).type === 'search' ||
    (element as HTMLInputElement).type === 'email' ||
    (element as HTMLInputElement).type === 'password' ||
    (element as HTMLInputElement).type === 'number' ||
    (element as HTMLInputElement).type === 'tel' ||
    (element as HTMLInputElement).type === 'url';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isEditable
  );
}

/**
 * Hook for keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onSearch: () => searchInputRef.current?.focus(),
 *   onNew: () => setShowModal(true),
 *   onDelete: handleBulkDelete,
 *   onClose: () => setShowModal(false),
 * });
 * ```
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig): void {
  const {
    onSearch,
    onNew,
    onDelete,
    onClose,
    onRefresh,
    onToggleTab,
    onSelectAll,
    disabled = false,
  } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if shortcuts are disabled
      if (disabled) return;

      const target = e.target as HTMLElement;
      const isInput = isInputElement(target);

      // Cmd/Ctrl modifier
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      // ========================================================================
      // Global shortcuts (work everywhere)
      // ========================================================================

      // Escape: Close modal/clear selection (works in inputs too)
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      // ========================================================================
      // Input-aware shortcuts (skip when typing in input fields)
      // ========================================================================

      if (isInput) {
        // Only allow escape in inputs
        return;
      }

      // Cmd/Ctrl+K: Focus search
      if (cmdOrCtrl && e.key === 'k' && onSearch) {
        e.preventDefault();
        onSearch();
        return;
      }

      // Cmd/Ctrl+N: New item
      if (cmdOrCtrl && e.key === 'n' && onNew) {
        e.preventDefault();
        onNew();
        return;
      }

      // Cmd/Ctrl+R: Refresh
      if (cmdOrCtrl && e.key === 'r' && onRefresh) {
        e.preventDefault();
        onRefresh();
        return;
      }

      // Cmd/Ctrl+T: Toggle tab
      if (cmdOrCtrl && e.key === 't' && onToggleTab) {
        e.preventDefault();
        onToggleTab();
        return;
      }

      // Cmd/Ctrl+A: Select all
      if (cmdOrCtrl && e.key === 'a' && onSelectAll) {
        e.preventDefault();
        onSelectAll();
        return;
      }

      // Delete/Backspace: Delete selected items
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        e.preventDefault();
        onDelete();
        return;
      }
    },
    [disabled, onSearch, onNew, onDelete, onClose, onRefresh, onToggleTab, onSelectAll]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Keyboard shortcut display component props
 */
export interface KeyboardShortcut {
  keys: string[];
  description: string;
}

/**
 * Get all available keyboard shortcuts
 */
export function getKeyboardShortcuts(): KeyboardShortcut[] {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const mod = isMac ? '' : 'Ctrl';

  return [
    { keys: [mod, 'K'], description: 'Focus search' },
    { keys: [mod, 'N'], description: 'Create new item' },
    { keys: [mod, 'R'], description: 'Refresh data' },
    { keys: [mod, 'T'], description: 'Toggle tab' },
    { keys: [mod, 'A'], description: 'Select all' },
    { keys: ['Delete'], description: 'Delete selected' },
    { keys: ['Esc'], description: 'Close/Cancel' },
  ];
}
