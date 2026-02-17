/**
 * Memory Manager Demo Component
 *
 * Demonstrates integration of all memory management utilities:
 * - useMemoryData (fetch timeline & KV data)
 * - useMemoryMutations (CRUD operations)
 * - useKeyboardShortcuts (keyboard navigation)
 * - BulkActionsBar (bulk operations)
 * - Export functions (CSV, JSON, clipboard)
 */

import { useState, useRef, useEffect } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useMemoryData, useMemoryMutations, useKeyboardShortcuts } from '@/hooks';
import { BulkActionsBar } from './BulkActionsBar';
import type { TimelineEvent, KVMemory, MemoryTab } from '@/types/memory';

export function MemoryManagerDemo() {
  // State
  const [activeTab, setActiveTab] = useState<MemoryTab>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const {
    timelineEvents,
    timelineStats,
    kvMemories,
    isLoading,
    timelineError,
    kvError,
    refresh,
  } = useMemoryData({
    timelineDays: 7,
    autoFetch: true,
  });

  // Mutations
  const {
    deleteTimelineEvent,
    bulkDeleteTimeline,
    deleteKVMemory,
    bulkDeleteKV,
    isLoading: isMutating,
    error: mutationError,
  } = useMemoryMutations();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onNew: () => setShowModal(true),
    onDelete: handleBulkDelete,
    onClose: () => {
      setShowModal(false);
      setSelectedIds(new Set());
    },
    onRefresh: refresh,
    onToggleTab: () => setActiveTab((prev) => (prev === 'timeline' ? 'kv' : 'timeline')),
    onSelectAll: handleSelectAll,
  });

  /**
   * Handle bulk delete
   */
  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    try {
      if (activeTab === 'timeline') {
        const result = await bulkDeleteTimeline(Array.from(selectedIds));
        console.log(`Deleted ${result.deleted} timeline events`);
        if (result.errors) {
          console.error('Errors:', result.errors);
        }
      } else {
        const result = await bulkDeleteKV(Array.from(selectedIds));
        console.log(`Deleted ${result.deleted} KV memories`);
        if (result.errors) {
          console.error('Errors:', result.errors);
        }
      }

      // Clear selection and refresh
      setSelectedIds(new Set());
      await refresh();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  }

  /**
   * Handle select all
   */
  function handleSelectAll() {
    if (activeTab === 'timeline') {
      const filtered = getFilteredTimelineEvents();
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    } else {
      const filtered = getFilteredKVMemories();
      setSelectedIds(new Set(filtered.map((m) => m.key)));
    }
  }

  /**
   * Handle clear selection
   */
  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  /**
   * Handle toggle selection
   */
  function handleToggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /**
   * Get filtered timeline events
   */
  function getFilteredTimelineEvents(): TimelineEvent[] {
    if (!searchQuery) return timelineEvents;

    const query = searchQuery.toLowerCase();
    return timelineEvents.filter(
      (event) =>
        event.type.toLowerCase().includes(query) ||
        event.title?.toLowerCase().includes(query) ||
        event.namespace?.toLowerCase().includes(query)
    );
  }

  /**
   * Get filtered KV memories
   */
  function getFilteredKVMemories(): KVMemory[] {
    if (!searchQuery) return kvMemories;

    const query = searchQuery.toLowerCase();
    return kvMemories.filter(
      (memory) =>
        memory.key.toLowerCase().includes(query) ||
        memory.namespace?.toLowerCase().includes(query) ||
        JSON.stringify(memory.value).toLowerCase().includes(query)
    );
  }

  /**
   * Get selected items for bulk actions
   */
  function getSelectedItems(): TimelineEvent[] | KVMemory[] {
    if (activeTab === 'timeline') {
      return timelineEvents.filter((e) => selectedIds.has(e.id));
    } else {
      return kvMemories.filter((m) => selectedIds.has(m.key));
    }
  }

  // Filter data
  const filteredTimeline = getFilteredTimelineEvents();
  const filteredKV = getFilteredKVMemories();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Memory Manager
            </h1>

            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                onClick={refresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* New button */}
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Timeline ({timelineEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('kv')}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'kv'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              KV Memories ({kvMemories.length})
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search... (Cmd/Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error display */}
        {(timelineError || kvError || mutationError) && (
          <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">
              Error: {timelineError?.message || kvError?.message || mutationError?.message}
            </p>
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Timeline Events ({filteredTimeline.length})
            </h2>

            {/* Stats */}
            {timelineStats && (
              <div className="mb-4 flex gap-4">
                {Object.entries(timelineStats.by_type).map(([type, count]) => (
                  <div
                    key={type}
                    className="rounded-md bg-white px-4 py-2 shadow dark:bg-gray-800"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">{type}:</span>{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* List */}
            <div className="space-y-2">
              {filteredTimeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-md bg-white p-4 shadow hover:shadow-md dark:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(event.id)}
                    onChange={() => handleToggleSelection(event.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {event.type} " {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KV tab */}
        {activeTab === 'kv' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              KV Memories ({filteredKV.length})
            </h2>

            <div className="space-y-2">
              {filteredKV.map((memory) => (
                <div
                  key={memory.key}
                  className="flex items-center gap-3 rounded-md bg-white p-4 shadow hover:shadow-md dark:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(memory.key)}
                    onChange={() => handleToggleSelection(memory.key)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {memory.key}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {memory.namespace && `${memory.namespace} " `}
                      {new Date(memory.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedItems={getSelectedItems()}
        type={activeTab}
        onDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
        isDeleting={isMutating}
      />

      {/* Keyboard shortcuts help (bottom right) */}
      <div className="fixed bottom-4 right-4 rounded-md bg-white p-3 text-xs text-gray-600 shadow-lg dark:bg-gray-800 dark:text-gray-400">
        <div className="font-semibold">Keyboard Shortcuts:</div>
        <div>/Ctrl+K: Search</div>
        <div>/Ctrl+N: New</div>
        <div>/Ctrl+R: Refresh</div>
        <div>Delete: Bulk delete</div>
      </div>
    </div>
  );
}
