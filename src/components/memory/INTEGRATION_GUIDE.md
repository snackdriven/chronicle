# Memory Forms Integration Guide

Quick reference for integrating modal and forms with tables and API.

## For Agent 2 (Tables & Search)

### Basic Integration Pattern

```typescript
import { useState } from 'react';
import { FullFormModal, TimelineEventForm } from '../memory';
import { TimelineEventFormData } from '../../lib/validation/memorySchemas';

function TimelineEventsTable() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventFormData | null>(null);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (event: TimelineEventFormData) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSubmit = async (data: TimelineEventFormData) => {
    // TODO: Call API (Agent 4 will provide)
    console.log('Submit:', data);
    handleClose();
  };

  return (
    <>
      {/* Add Create Button to Table Header */}
      <button onClick={handleCreate}>Create Event</button>

      {/* Add Edit Button to Each Row */}
      <button onClick={() => handleEdit(rowData)}>Edit</button>

      {/* Modal */}
      <FullFormModal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
      >
        <TimelineEventForm
          mode={editingEvent ? 'edit' : 'create'}
          initialData={editingEvent || undefined}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      </FullFormModal>
    </>
  );
}
```

### KV Memories Integration

Same pattern, just replace:
- `TimelineEventForm` with `KVMemoryForm`
- `TimelineEventFormData` with `KVMemoryFormData`

## For Agent 4 (API Integration)

### API Hooks to Create

```typescript
// src/lib/api/memories.ts

import { TimelineEventFormData, KVMemoryFormData } from '../validation/memorySchemas';

// Timeline Events
export async function createTimelineEvent(data: TimelineEventFormData) {
  const response = await fetch('/api/memories/timeline-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateTimelineEvent(id: string, data: TimelineEventFormData) {
  const response = await fetch(`/api/memories/timeline-events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// KV Memories
export async function createKVMemory(data: KVMemoryFormData) {
  const response = await fetch('/api/memories/kv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateKVMemory(key: string, data: KVMemoryFormData) {
  const response = await fetch(`/api/memories/kv/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Connect to Forms

```typescript
import { createTimelineEvent, updateTimelineEvent } from '../../lib/api/memories';

const handleSubmit = async (data: TimelineEventFormData) => {
  try {
    if (editingEvent) {
      await updateTimelineEvent(editingEvent.id, data);
    } else {
      await createTimelineEvent(data);
    }
    // Refresh table data
    refetchEvents();
    handleClose();
  } catch (error) {
    console.error('Failed to save event:', error);
    // Show error toast
  }
};
```

## Data Flow

```
User clicks "Create" button
  ↓
Table component: setIsModalOpen(true)
  ↓
Modal opens with TimelineEventForm
  ↓
User fills form and clicks "Create Event"
  ↓
Form validates with Zod schema
  ↓
If valid: calls onSubmit(data)
  ↓
Table component: calls createTimelineEvent(data)
  ↓
API call to /api/memories/timeline-events (POST)
  ↓
On success: refresh table, close modal
```

## Form Data Transformations

### Timeline Events

**Form Output:**
```json
{
  "timestamp": "2025-11-23T14:30",
  "type": "jira_ticket",
  "title": "Implement feature",
  "namespace": "development",
  "metadata": {
    "ticketId": "PROJ-123",
    "priority": "high"
  }
}
```

**API Expects:** Same format (timestamp as ISO string)

### KV Memories

**Form Output:**
```json
{
  "key": "user.preferences",
  "value": {
    "theme": "dark",
    "notifications": true
  },
  "namespace": "settings",
  "ttl": 604800
}
```

**Notes:**
- `ttl` is already converted to seconds by the form
- `ttlUnit` is removed (internal to form only)

## Validation Schemas

Both forms use Zod schemas from `/src/lib/validation/memorySchemas.ts`:

- `timelineEventSchema` - Timeline Events
- `kvMemorySchema` - KV Memories

**Import:**
```typescript
import { timelineEventSchema, kvMemorySchema } from '../../lib/validation/memorySchemas';
```

**Use for additional validation:**
```typescript
const result = timelineEventSchema.safeParse(data);
if (!result.success) {
  console.error('Validation errors:', result.error);
}
```

## Components Exported

From `/src/components/memory/index.ts`:

```typescript
export { FullFormModal } from './FullFormModal';
export { TimelineEventForm, KVMemoryForm, JSONEditor } from './forms';
```

From `/src/lib/validation/memorySchemas.ts`:

```typescript
export {
  timelineEventSchema,
  kvMemorySchema,
  TimelineEventFormData,
  KVMemoryFormData,
  EVENT_TYPES,
  TTL_UNITS,
  convertTTLToSeconds,
  convertSecondsToTTL,
  validateJSON,
};
```

## Event Types Reference

```typescript
const EVENT_TYPES = [
  { value: 'jira_ticket', label: 'JIRA Ticket' },
  { value: 'spotify_play', label: 'Spotify Play' },
  { value: 'calendar_event', label: 'Calendar Event' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'github_commit', label: 'GitHub Commit' },
];
```

## TTL Units Reference

```typescript
const TTL_UNITS = [
  { value: 'seconds', label: 'Seconds', multiplier: 1 },
  { value: 'minutes', label: 'Minutes', multiplier: 60 },
  { value: 'hours', label: 'Hours', multiplier: 3600 },
  { value: 'days', label: 'Days', multiplier: 86400 },
];
```

## Common Patterns

### Loading State During Submit

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (data: TimelineEventFormData) => {
  setIsLoading(true);
  try {
    await createTimelineEvent(data);
    handleClose();
  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};

// Form will show "Saving..." button when isLoading
```

### Error Handling

```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (data: TimelineEventFormData) => {
  setError(null);
  try {
    await createTimelineEvent(data);
    handleClose();
  } catch (err) {
    setError(err.message);
    // Form stays open, error displayed
  }
};
```

### Optimistic Updates

```typescript
const handleSubmit = async (data: TimelineEventFormData) => {
  // Optimistically add to table
  addEventToTable(data);
  handleClose();

  try {
    const saved = await createTimelineEvent(data);
    // Update with server data (has ID, etc.)
    updateEventInTable(data, saved);
  } catch (error) {
    // Rollback on error
    removeEventFromTable(data);
    // Show error toast
  }
};
```

## Dependencies Installed

```json
{
  "@headlessui/react": "^1.7.19",
  "react-hook-form": "^7.66.1",
  "@hookform/resolvers": "^3.10.0",
  "zod": "^3.25.76",
  "@monaco-editor/react": "^4.7.0"
}
```

## Files Created

```
src/
├── lib/
│   └── validation/
│       └── memorySchemas.ts          (Zod schemas & types)
└── components/
    └── memory/
        ├── FullFormModal.tsx          (Modal container)
        ├── MemoryFormsDemo.tsx        (Demo/example)
        ├── index.ts                   (Exports)
        ├── forms/
        │   ├── TimelineEventForm.tsx  (Timeline form)
        │   ├── KVMemoryForm.tsx       (KV form)
        │   ├── JSONEditor.tsx         (Monaco editor)
        │   └── index.ts               (Exports)
        ├── TESTING_CHECKLIST.md       (Test cases)
        └── INTEGRATION_GUIDE.md       (This file)
```

## Quick Start

1. **Import components:**
   ```typescript
   import { FullFormModal, TimelineEventForm } from './components/memory';
   ```

2. **Add modal state:**
   ```typescript
   const [isOpen, setIsOpen] = useState(false);
   ```

3. **Add button to table:**
   ```typescript
   <button onClick={() => setIsOpen(true)}>Create</button>
   ```

4. **Add modal:**
   ```typescript
   <FullFormModal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Event">
     <TimelineEventForm onSubmit={handleSubmit} onCancel={() => setIsOpen(false)} />
   </FullFormModal>
   ```

5. **Connect API (Agent 4):**
   ```typescript
   const handleSubmit = async (data) => {
     await createTimelineEvent(data);
     setIsOpen(false);
   };
   ```

Done!
