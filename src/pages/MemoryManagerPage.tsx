import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Clock, Brain } from 'lucide-react';
import { MemoryTable } from '@/components/memory/MemoryTable';
import { timelineColumns } from '@/components/memory/columns/timelineColumns';
import { kvColumns } from '@/components/memory/columns/kvColumns';
import { FullFormModal, TimelineEventForm, KVMemoryForm } from '@/components/memory';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useMemoryData, useMemoryMutations, useKeyboardShortcuts } from '@/hooks';
import type {
  MemoryTab,
  TimelineEvent,
  KVMemory,
  TimelineTableMeta,
  KVTableMeta,
} from '@/types/memory';
import { clsx } from 'clsx';

/**
 * Memory Manager Page
 *
 * Main page for managing timeline events and KV memories
 * Features tab navigation between Timeline and KV Store views
 */
export function MemoryManagerPage() {
  const [activeTab, setActiveTab] = useState<MemoryTab>('timeline');
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [kvModalOpen, setKVModalOpen] = useState(false);
  const [editingTimelineEvent, setEditingTimelineEvent] = useState<TimelineEvent | null>(null);
  const [editingKVMemory, setEditingKVMemory] = useState<KVMemory | null>(null);

  // Agent 4: Data fetching hooks
  const { timelineEvents, kvMemories, isLoading, refresh } = useMemoryData({ timelineDays: 7 });

  console.log('[MemoryManagerPage] Hook data:', {
    timelineEvents,
    'timelineEvents length': timelineEvents?.length,
    kvMemories,
    'kvMemories length': kvMemories?.length,
    isLoading,
  });

  // Agent 4: Mutation hooks
  const {
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    createKVMemory,
    updateKVMemory,
    deleteKVMemory,
  } = useMemoryMutations();

  // Agent 4: Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => document.getElementById('search-input')?.focus(),
    onNew: () => {
      if (activeTab === 'timeline') {
        handleAddTimelineEvent();
      } else {
        handleAddKVMemory();
      }
    },
    onRefresh: refresh,
    onToggleTab: () => setActiveTab(prev => prev === 'timeline' ? 'kv' : 'timeline'),
  });

  const handleAddTimelineEvent = () => {
    setEditingTimelineEvent(null);
    setTimelineModalOpen(true);
  };

  const handleEditTimelineEvent = (event: TimelineEvent) => {
    setEditingTimelineEvent(event);
    setTimelineModalOpen(true);
  };

  // Convert TimelineEvent to form data format
  const timelineEventToFormData = (event: TimelineEvent | null) => {
    if (!event) return undefined;
    return {
      type: event.type,
      timestamp: new Date(event.timestamp).toISOString(),
      title: event.title,
      namespace: event.namespace,
      metadata: event.metadata,
    };
  };

  const handleDeleteTimelineEvent = async (id: string) => {
    await deleteTimelineEvent(id);
    refresh();
  };

  const handleSubmitTimelineEvent = async (data: any) => {
    if (editingTimelineEvent) {
      await updateTimelineEvent(editingTimelineEvent.id, data);
    } else {
      await createTimelineEvent(data);
    }
    setTimelineModalOpen(false);
    setEditingTimelineEvent(null);
    refresh();
  };

  const handleAddKVMemory = () => {
    setEditingKVMemory(null);
    setKVModalOpen(true);
  };

  const handleEditKVMemory = (memory: KVMemory) => {
    setEditingKVMemory(memory);
    setKVModalOpen(true);
  };

  // Convert KVMemory to form data format
  const kvMemoryToFormData = (memory: KVMemory | null) => {
    if (!memory) return undefined;
    return {
      key: memory.key,
      value: memory.value,
      namespace: memory.namespace,
    };
  };

  const handleDeleteKVMemory = async (key: string) => {
    await deleteKVMemory(key);
    refresh();
  };

  const handleSubmitKVMemory = async (data: any) => {
    if (editingKVMemory) {
      await updateKVMemory(editingKVMemory.key, data);
    } else {
      await createKVMemory(data);
    }
    setKVModalOpen(false);
    setEditingKVMemory(null);
    refresh();
  };

  console.log('[MemoryManagerPage] Rendering with activeTab:', activeTab);
  console.log('[MemoryManagerPage] Data passed to tables:', {
    timeline: { data: timelineEvents || [], length: (timelineEvents || []).length },
    kv: { data: kvMemories || [], length: (kvMemories || []).length },
  });

  // Test API function
  const testAPI = async () => {
    try {
      console.log('[testAPI] Starting API test...');
      const response = await fetch('http://localhost:3001/api/mcp/chronicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_timeline_range',
          arguments: {
            start_date: '2024-11-17',
            end_date: '2024-11-24',
            limit: 1000,
          },
        }),
      });
      console.log('[testAPI] Response status:', response.status);
      const data = await response.json();
      console.log('[testAPI] Response data:', data);
      alert('API test successful! Check console for details.');
    } catch (error) {
      console.error('[testAPI] Error:', error);
      alert('API test failed! Check console for error details.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-pink-900/8 via-purple-900/5 via-cyan-900/5 to-indigo-900/8 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Brain className="w-10 h-10 text-primary" />
              </motion.div>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text">
                Memory Manager
              </h1>
            </div>
            <button
              onClick={testAPI}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Test API
            </button>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">
            Browse and manage your timeline events and key-value memories
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('timeline')}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative',
                activeTab === 'timeline'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Clock className="w-4 h-4" />
              Timeline Events
              {activeTab === 'timeline' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('kv')}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative',
                activeTab === 'kv'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Database className="w-4 h-4" />
              KV Store
              {activeTab === 'kv' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          </div>
        </motion.div>

        {/* Table Content - Wrapped in ErrorBoundary */}
        <ErrorBoundary>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'timeline' ? (
              <MemoryTable<TimelineEvent>
                data={timelineEvents || []}
                columns={timelineColumns}
                onAddNew={handleAddTimelineEvent}
                addButtonLabel="Add Event"
                emptyMessage="No timeline events found. Create your first event!"
                isLoading={isLoading}
                meta={{
                  openEditModal: handleEditTimelineEvent,
                  deleteEvent: handleDeleteTimelineEvent,
                  updateEvent: async (id: string, data: any) => {
                    await updateTimelineEvent(id, data);
                    refresh();
                  },
                } satisfies TimelineTableMeta}
              />
            ) : (
              <MemoryTable<KVMemory>
                data={kvMemories || []}
                columns={kvColumns}
                onAddNew={handleAddKVMemory}
                addButtonLabel="Add Memory"
                emptyMessage="No KV memories found. Store your first memory!"
                isLoading={isLoading}
                meta={{
                  openEditModal: handleEditKVMemory,
                  deleteEvent: handleDeleteKVMemory,
                  updateEvent: async (key: string, data: any) => {
                    await updateKVMemory(key, data);
                    refresh();
                  },
                } satisfies KVTableMeta}
              />
            )}
          </motion.div>
        </ErrorBoundary>
      </div>

      {/* Timeline Event Modal */}
      <FullFormModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
        title={editingTimelineEvent ? 'Edit Timeline Event' : 'Create Timeline Event'}
      >
        <TimelineEventForm
          initialData={timelineEventToFormData(editingTimelineEvent)}
          onSubmit={handleSubmitTimelineEvent}
          onCancel={() => setTimelineModalOpen(false)}
        />
      </FullFormModal>

      {/* KV Memory Modal */}
      <FullFormModal
        isOpen={kvModalOpen}
        onClose={() => setKVModalOpen(false)}
        title={editingKVMemory ? 'Edit KV Memory' : 'Create KV Memory'}
      >
        <KVMemoryForm
          initialData={kvMemoryToFormData(editingKVMemory)}
          onSubmit={handleSubmitKVMemory}
          onCancel={() => setKVModalOpen(false)}
        />
      </FullFormModal>
    </div>
  );
}
