import { useState } from 'react';
import { FullFormModal } from './FullFormModal';
import { TimelineEventForm, KVMemoryForm } from './forms';
import { TimelineEventFormData, KVMemoryFormData } from '../../lib/validation/memorySchemas';

/**
 * MemoryFormsDemo - Example usage of modal and forms
 *
 * Shows how to integrate:
 * - FullFormModal with TimelineEventForm
 * - FullFormModal with KVMemoryForm
 * - Form submission handlers
 * - Create vs Edit modes
 *
 * Usage in your tables:
 * - Add button onClick -> setIsTimelineModalOpen(true)
 * - Edit button onClick -> setEditingEvent(event); setIsTimelineModalOpen(true)
 */
export function MemoryFormsDemo() {
  // Timeline Event Modal State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventFormData | null>(null);

  // KV Memory Modal State
  const [isKVModalOpen, setIsKVModalOpen] = useState(false);
  const [editingKV, setEditingKV] = useState<KVMemoryFormData | null>(null);

  // Timeline Event Handlers
  const handleTimelineSubmit = async (data: TimelineEventFormData) => {
    console.log('Timeline Event Submitted:', data);

    // TODO: Call API endpoint (Agent 4 will provide this)
    // if (editingEvent) {
    //   await updateTimelineEvent(editingEvent.id, data);
    // } else {
    //   await createTimelineEvent(data);
    // }

    // Close modal and reset state
    setIsTimelineModalOpen(false);
    setEditingEvent(null);
  };

  const handleTimelineCancel = () => {
    setIsTimelineModalOpen(false);
    setEditingEvent(null);
  };

  // KV Memory Handlers
  const handleKVSubmit = async (data: KVMemoryFormData) => {
    console.log('KV Memory Submitted:', data);

    // TODO: Call API endpoint (Agent 4 will provide this)
    // if (editingKV) {
    //   await updateKVMemory(editingKV.key, data);
    // } else {
    //   await createKVMemory(data);
    // }

    // Close modal and reset state
    setIsKVModalOpen(false);
    setEditingKV(null);
  };

  const handleKVCancel = () => {
    setIsKVModalOpen(false);
    setEditingKV(null);
  };

  // Example: Simulate editing an existing event
  const handleEditExampleEvent = () => {
    setEditingEvent({
      timestamp: new Date().toISOString(),
      type: 'jira_ticket',
      title: 'Implement memory forms',
      namespace: 'development',
      metadata: {
        ticketId: 'PROJ-123',
        status: 'in-progress',
        assignee: 'agent-3',
      },
    });
    setIsTimelineModalOpen(true);
  };

  // Example: Simulate editing an existing KV memory
  const handleEditExampleKV = () => {
    setEditingKV({
      key: 'user.preferences',
      value: {
        theme: 'dark',
        notifications: true,
        language: 'en',
      },
      namespace: 'settings',
      ttl: 7,
      ttlUnit: 'days',
    });
    setIsKVModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Memory Forms Demo</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timeline Event Actions */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Timeline Events</h2>
          <button
            onClick={() => setIsTimelineModalOpen(true)}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Timeline Event
          </button>
          <button
            onClick={handleEditExampleEvent}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit Example Event
          </button>
        </div>

        {/* KV Memory Actions */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">KV Memories</h2>
          <button
            onClick={() => setIsKVModalOpen(true)}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create KV Memory
          </button>
          <button
            onClick={handleEditExampleKV}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit Example Memory
          </button>
        </div>
      </div>

      {/* Timeline Event Modal */}
      <FullFormModal
        isOpen={isTimelineModalOpen}
        onClose={handleTimelineCancel}
        title={editingEvent ? 'Edit Timeline Event' : 'Create Timeline Event'}
      >
        <TimelineEventForm
          mode={editingEvent ? 'edit' : 'create'}
          initialData={editingEvent || undefined}
          onSubmit={handleTimelineSubmit}
          onCancel={handleTimelineCancel}
        />
      </FullFormModal>

      {/* KV Memory Modal */}
      <FullFormModal
        isOpen={isKVModalOpen}
        onClose={handleKVCancel}
        title={editingKV ? 'Edit KV Memory' : 'Create KV Memory'}
      >
        <KVMemoryForm
          mode={editingKV ? 'edit' : 'create'}
          initialData={editingKV || undefined}
          onSubmit={handleKVSubmit}
          onCancel={handleKVCancel}
        />
      </FullFormModal>

      {/* Usage Instructions */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Integration Guide</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>For Tables (Agent 2):</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Add "Create" button that calls <code>setIsTimelineModalOpen(true)</code></li>
            <li>Add "Edit" button in each row that sets the item data and opens modal</li>
            <li>Modal and forms handle all validation and UI</li>
          </ul>
          <p className="mt-3"><strong>For API Integration (Agent 4):</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Forms call <code>onSubmit</code> with validated data</li>
            <li>Connect to <code>/api/memories/timeline-events</code> (POST/PUT)</li>
            <li>Connect to <code>/api/memories/kv</code> (POST/PUT)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
