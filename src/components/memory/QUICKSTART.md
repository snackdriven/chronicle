# Memory Forms Quick Start

## Try the Demo

### 1. Add to App.tsx (Temporary)

```typescript
// /src/App.tsx
import { MemoryFormsDemo } from './components/memory/MemoryFormsDemo';

function App() {
  return (
    <div>
      <MemoryFormsDemo />
    </div>
  );
}
```

### 2. Start Dev Server

```bash
pnpm dev
```

### 3. Open Browser

Navigate to `http://localhost:5180`

### 4. Test the Forms

Click the buttons to:
- Create Timeline Event (empty form)
- Edit Example Event (pre-filled form)
- Create KV Memory (empty form)
- Edit Example Memory (pre-filled form)

## Basic Usage

### Step 1: Import Components

```typescript
import { FullFormModal, TimelineEventForm } from './components/memory';
import { TimelineEventFormData } from './lib/validation/memorySchemas';
```

### Step 2: Add State

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
```

### Step 3: Create Handlers

```typescript
const handleCreate = () => {
  setEditingEvent(null);
  setIsModalOpen(true);
};

const handleSubmit = async (data: TimelineEventFormData) => {
  console.log('Submitted:', data);
  // TODO: Call API
  setIsModalOpen(false);
};

const handleClose = () => {
  setIsModalOpen(false);
  setEditingEvent(null);
};
```

### Step 4: Add Button

```typescript
<button onClick={handleCreate}>
  Create Timeline Event
</button>
```

### Step 5: Add Modal

```typescript
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
```

## Complete Example

```typescript
import { useState } from 'react';
import { FullFormModal, TimelineEventForm } from './components/memory';
import { TimelineEventFormData } from './lib/validation/memorySchemas';

export function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (data: TimelineEventFormData) => {
    console.log('Timeline Event:', data);
    // Output:
    // {
    //   timestamp: "2025-11-23T14:30:00.000Z",
    //   type: "jira_ticket",
    //   title: "My event",
    //   namespace: "development",
    //   metadata: { key: "value" }
    // }
    setIsModalOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Create Event
      </button>

      <FullFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Timeline Event"
      >
        <TimelineEventForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FullFormModal>
    </>
  );
}
```

## KV Memory Example

```typescript
import { useState } from 'react';
import { FullFormModal, KVMemoryForm } from './components/memory';
import { KVMemoryFormData } from './lib/validation/memorySchemas';

export function MyKVComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (data: KVMemoryFormData) => {
    console.log('KV Memory:', data);
    // Output:
    // {
    //   key: "user.preferences",
    //   value: { theme: "dark" },
    //   namespace: "settings",
    //   ttl: 604800  // 7 days in seconds
    // }
    setIsModalOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Create Memory
      </button>

      <FullFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create KV Memory"
      >
        <KVMemoryForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FullFormModal>
    </>
  );
}
```

## Edit Mode Example

```typescript
const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

// When user clicks edit button
const handleEdit = (event: TimelineEvent) => {
  setEditingEvent(event);
  setIsModalOpen(true);
};

// In modal
<TimelineEventForm
  mode="edit"  // Changes button text to "Update Event"
  initialData={editingEvent}  // Pre-fills form
  onSubmit={handleSubmit}
  onCancel={handleClose}
/>
```

## Validation Examples

### Valid Inputs

```typescript
// Timeline Event
{
  type: "jira_ticket",           // ✓ One of EVENT_TYPES
  timestamp: "2025-11-23T14:30", // ✓ Valid datetime
  title: "My event",             // ✓ Under 200 chars
  namespace: "development",      // ✓ Lowercase, no special chars
  metadata: { key: "value" }     // ✓ Valid JSON object
}

// KV Memory
{
  key: "user.preferences",       // ✓ Letters, dots, hyphens
  value: { theme: "dark" },      // ✓ Valid JSON
  namespace: "settings",         // ✓ Lowercase, no special chars
  ttl: 7,                        // ✓ Positive integer
  ttlUnit: "days"                // ✓ One of TTL_UNITS
}
```

### Invalid Inputs (Will Show Errors)

```typescript
// Timeline Event
{
  type: "",                      // ✗ Required
  timestamp: "invalid",          // ✗ Must be datetime
  title: "A".repeat(201),        // ✗ Max 200 chars
  namespace: "My-Namespace",     // ✗ No uppercase
  metadata: "{invalid json"      // ✗ Invalid JSON
}

// KV Memory
{
  key: "user preferences",       // ✗ No spaces
  value: "{invalid}",            // ✗ Invalid JSON
  namespace: "Settings_123",     // ✗ No uppercase
  ttl: -5,                       // ✗ Must be positive
  ttlUnit: "weeks"               // ✗ Not in TTL_UNITS
}
```

## Common Patterns

### Loading State

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (data: TimelineEventFormData) => {
  setIsLoading(true);
  try {
    await createEvent(data);
    setIsModalOpen(false);
  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};

// Form automatically shows "Saving..." when isSubmitting is true
```

### Error Handling

```typescript
const handleSubmit = async (data: TimelineEventFormData) => {
  try {
    await createEvent(data);
    setIsModalOpen(false);
  } catch (error) {
    alert('Failed to create event: ' + error.message);
    // Modal stays open for retry
  }
};
```

### Refresh Table After Submit

```typescript
const { data: events, refetch } = useEvents(); // Your data hook

const handleSubmit = async (data: TimelineEventFormData) => {
  await createEvent(data);
  setIsModalOpen(false);
  refetch(); // Refresh table data
};
```

## Files Reference

```
/src/
├── components/
│   └── memory/
│       ├── FullFormModal.tsx          (Modal)
│       ├── forms/
│       │   ├── TimelineEventForm.tsx  (Timeline form)
│       │   ├── KVMemoryForm.tsx       (KV form)
│       │   └── JSONEditor.tsx         (JSON editor)
│       └── index.ts                   (Exports)
└── lib/
    └── validation/
        └── memorySchemas.ts           (Schemas & types)
```

## Available Imports

```typescript
// Components
import {
  FullFormModal,
  TimelineEventForm,
  KVMemoryForm,
  JSONEditor,
} from './components/memory';

// Types & Schemas
import {
  TimelineEventFormData,
  KVMemoryFormData,
  timelineEventSchema,
  kvMemorySchema,
  EVENT_TYPES,
  TTL_UNITS,
  convertTTLToSeconds,
  convertSecondsToTTL,
  validateJSON,
} from './lib/validation/memorySchemas';
```

## Event Types

```typescript
const EVENT_TYPES = [
  { value: 'jira_ticket', label: 'JIRA Ticket' },
  { value: 'spotify_play', label: 'Spotify Play' },
  { value: 'calendar_event', label: 'Calendar Event' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'github_commit', label: 'GitHub Commit' },
];
```

## TTL Units

```typescript
const TTL_UNITS = [
  { value: 'seconds', label: 'Seconds', multiplier: 1 },
  { value: 'minutes', label: 'Minutes', multiplier: 60 },
  { value: 'hours', label: 'Hours', multiplier: 3600 },
  { value: 'days', label: 'Days', multiplier: 86400 },
];

// Example: 5 days = 5 * 86400 = 432000 seconds
```

## Keyboard Shortcuts

- **Tab** - Navigate between fields
- **Enter** - Submit form (when focused on button)
- **Escape** - Close modal
- **Click outside** - Close modal

## Testing Checklist

- [ ] Modal opens and closes
- [ ] Form validates required fields
- [ ] Form validates optional fields
- [ ] JSON editor syntax highlights
- [ ] JSON editor shows validation errors
- [ ] Create mode works (empty form)
- [ ] Edit mode works (pre-filled form)
- [ ] Submit button disables during save
- [ ] Cancel button closes modal
- [ ] Escape key closes modal
- [ ] TTL conversion works (e.g., 7 days → 604800 seconds)

## Troubleshooting

### Modal doesn't open
- Check `isOpen` state is true
- Check modal component is rendered
- Check z-index conflicts

### Validation not working
- Check Zod schema imports
- Check zodResolver is used in useForm
- Check error messages are displayed

### JSON editor not loading
- Check @monaco-editor/react is installed
- Check internet connection (Monaco loads from CDN)
- Check browser console for errors

### Form doesn't submit
- Check onSubmit is async function
- Check validation passes (no errors)
- Check submit button is not disabled

## Next Steps

1. Test the demo component
2. Integrate with your tables (see INTEGRATION_GUIDE.md)
3. Connect to API endpoints (see INTEGRATION_GUIDE.md)
4. Add error toasts (Agent 5)
5. Add success toasts (Agent 5)

## Documentation

- **QUICKSTART.md** - This file
- **INTEGRATION_GUIDE.md** - Detailed integration guide
- **TESTING_CHECKLIST.md** - Comprehensive test cases
- **COMPONENT_HIERARCHY.md** - Visual component structure
- **AGENT3_SUMMARY.md** - Complete deliverable summary

## Support

All components are fully typed with TypeScript. Use your IDE's autocomplete for prop suggestions and type checking.

If you encounter issues, check:
1. Component props match interfaces
2. State management is correct
3. Validation schemas are imported
4. Dependencies are installed
