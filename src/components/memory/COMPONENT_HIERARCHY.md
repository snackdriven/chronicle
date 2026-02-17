# Memory Forms Component Hierarchy

## Visual Structure

```
Table Component (Agent 2)
│
├─ [Create Button] ──┐
│                    │
└─ [Edit Button] ────┤
                     │
                     ▼
            ┌─────────────────────────┐
            │   FullFormModal         │
            │   - Backdrop blur       │
            │   - Slide animation     │
            │   - Focus trap          │
            │   - Escape to close     │
            └─────────────────────────┘
                     │
                     ├──────────────────────────────┐
                     ▼                              ▼
        ┌────────────────────────┐    ┌──────────────────────┐
        │ TimelineEventForm      │    │ KVMemoryForm         │
        │                        │    │                      │
        │ ┌────────────────────┐ │    │ ┌──────────────────┐ │
        │ │ Type (select)      │ │    │ │ Key (text)       │ │
        │ └────────────────────┘ │    │ └──────────────────┘ │
        │ ┌────────────────────┐ │    │ ┌──────────────────┐ │
        │ │ Timestamp (dt)     │ │    │ │ Value (JSON)     │ │
        │ └────────────────────┘ │    │ │  ┌─────────────┐ │ │
        │ ┌────────────────────┐ │    │ │  │ JSONEditor  │ │ │
        │ │ Title (text)       │ │    │ │  │ - Monaco    │ │ │
        │ └────────────────────┘ │    │ │  │ - Highlight │ │ │
        │ ┌────────────────────┐ │    │ │  │ - Validate  │ │ │
        │ │ Namespace (text)   │ │    │ │  └─────────────┘ │ │
        │ └────────────────────┘ │    │ └──────────────────┘ │
        │ ┌────────────────────┐ │    │ ┌──────────────────┐ │
        │ │ Metadata (JSON)    │ │    │ │ Namespace (text) │ │
        │ │  ┌───────────────┐ │ │    │ └──────────────────┘ │
        │ │  │ JSONEditor    │ │ │    │ ┌──────────────────┐ │
        │ │  │ - Monaco      │ │ │    │ │ TTL + Unit       │ │
        │ │  │ - Highlight   │ │ │    │ │  [5] [days ▼]    │ │
        │ │  │ - Validate    │ │ │    │ └──────────────────┘ │
        │ │  └───────────────┘ │ │    │                      │
        │ └────────────────────┘ │    │ [Cancel] [Create]    │
        │                        │    └──────────────────────┘
        │ [Cancel] [Create]      │
        └────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Zod Validation │
        │ - Required     │
        │ - Regex        │
        │ - Max length   │
        │ - JSON valid   │
        └────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ onSubmit()     │ ──────────► API Call (Agent 4)
        └────────────────┘
```

## Data Flow

```
User Input
    │
    ▼
React Hook Form
    │
    ▼
Zod Schema Validation
    │
    ├──► Validation Error ──► Display inline error
    │
    ▼
onSubmit(validatedData)
    │
    ▼
Table Component Handler
    │
    ▼
API Call (Agent 4)
    │
    ├──► Success ──► Close modal, refresh table
    │
    └──► Error ──► Show error, keep modal open
```

## State Management

```
Table Component State
├─ isModalOpen: boolean
├─ editingItem: TimelineEvent | KVMemory | null
└─ formMode: 'create' | 'edit'

Form Component State (React Hook Form)
├─ formValues: TimelineEventFormData | KVMemoryFormData
├─ errors: FieldErrors
├─ isSubmitting: boolean
└─ isDirty: boolean

Modal Component State (Headless UI)
├─ isOpen: boolean (from props)
├─ focusTrap: active
└─ animationState: 'entering' | 'entered' | 'exiting' | 'exited'
```

## Component Responsibilities

### FullFormModal
- [x] Render backdrop with blur
- [x] Manage focus trap
- [x] Handle escape key
- [x] Animate enter/exit
- [x] Display title and close button
- [x] Render children (form)

### TimelineEventForm / KVMemoryForm
- [x] Initialize React Hook Form
- [x] Render form fields
- [x] Validate with Zod schema
- [x] Display validation errors
- [x] Handle submit event
- [x] Call onSubmit callback
- [x] Manage loading state
- [x] Differentiate create/edit modes

### JSONEditor
- [x] Render Monaco Editor
- [x] Syntax highlighting
- [x] Real-time JSON validation
- [x] Display validation errors
- [x] Emit onChange events
- [x] Support configurable height

### Validation Schemas
- [x] Define Zod schemas
- [x] Export TypeScript types
- [x] Validate field formats
- [x] Convert TTL units
- [x] Validate JSON strings

## File Dependencies

```
TimelineEventForm.tsx
│
├── react-hook-form (useForm, Controller)
├── @hookform/resolvers/zod (zodResolver)
├── zod (schemas)
├── JSONEditor.tsx
└── memorySchemas.ts
    ├── timelineEventSchema
    ├── EVENT_TYPES
    └── TimelineEventFormData

KVMemoryForm.tsx
│
├── react-hook-form (useForm, Controller)
├── @hookform/resolvers/zod (zodResolver)
├── zod (schemas)
├── JSONEditor.tsx
└── memorySchemas.ts
    ├── kvMemorySchema
    ├── TTL_UNITS
    ├── convertTTLToSeconds
    └── KVMemoryFormData

JSONEditor.tsx
│
├── @monaco-editor/react (Editor)
└── memorySchemas.ts (validateJSON)

FullFormModal.tsx
│
├── @headlessui/react (Dialog, Transition)
└── lucide-react (X icon)
```

## Integration Example

```typescript
// In your table component (Agent 2)

import { useState } from 'react';
import { FullFormModal, TimelineEventForm } from './components/memory';
import { TimelineEventFormData } from './lib/validation/memorySchemas';

function MyTable() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);

  const handleCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };

  const handleEdit = (item: TimelineEvent) => {
    setEditing(item);
    setIsOpen(true);
  };

  const handleSubmit = async (data: TimelineEventFormData) => {
    if (editing) {
      await updateTimelineEvent(editing.id, data); // Agent 4
    } else {
      await createTimelineEvent(data); // Agent 4
    }
    setIsOpen(false);
    setEditing(null);
    refetchData(); // Refresh table
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditing(null);
  };

  return (
    <>
      <button onClick={handleCreate}>Create Event</button>

      <table>
        {/* Table rows with edit buttons */}
        <button onClick={() => handleEdit(row)}>Edit</button>
      </table>

      <FullFormModal
        isOpen={isOpen}
        onClose={handleCancel}
        title={editing ? 'Edit Event' : 'Create Event'}
      >
        <TimelineEventForm
          mode={editing ? 'edit' : 'create'}
          initialData={editing || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </FullFormModal>
    </>
  );
}
```

## Validation Flow

```
User types in field
    │
    ▼
React Hook Form onChange
    │
    ▼
Zod schema.safeParse()
    │
    ├──► Valid
    │    └──► Clear error for that field
    │
    └──► Invalid
         └──► Set error for that field
              │
              ▼
         Display error message
         (red text below field)
         (red border on field)
```

## TTL Conversion Example

```
User inputs: TTL = 5, Unit = "days"
    │
    ▼
Form submission
    │
    ▼
convertTTLToSeconds(5, 'days')
    │
    ▼
5 * 86400 = 432000 seconds
    │
    ▼
Submitted to API:
{
  "ttl": 432000
  // ttlUnit removed
}
```

## Error Display Example

```
Field: namespace = "Test-123"
                    ▲
                    └─ Uppercase "T"

Zod Validation:
regex: /^[a-z0-9_-]+$/
Match: FAIL

Error Message:
"Namespace must contain only lowercase letters,
 numbers, hyphens, and underscores"

Display:
┌─────────────────────────────────┐
│ Namespace                       │
│ ┌─────────────────────────────┐ │
│ │ Test-123                    │ │ ← Red border
│ └─────────────────────────────┘ │
│ ⚠ Namespace must contain only   │ ← Red text
│   lowercase letters...          │
└─────────────────────────────────┘
```

## Component Props Reference

### FullFormModal
```typescript
{
  isOpen: boolean;           // Controls visibility
  onClose: () => void;       // Called on close
  title: string;             // Modal header
  children: ReactNode;       // Form component
}
```

### TimelineEventForm
```typescript
{
  initialData?: Partial<TimelineEventFormData>;  // Pre-fill for edit
  onSubmit: (data) => Promise<void>;             // Submit handler
  onCancel: () => void;                          // Cancel handler
  mode?: 'create' | 'edit';                      // Button text
}
```

### KVMemoryForm
```typescript
{
  initialData?: Partial<KVMemoryFormData>;  // Pre-fill for edit
  onSubmit: (data) => Promise<void>;        // Submit handler
  onCancel: () => void;                     // Cancel handler
  mode?: 'create' | 'edit';                 // Button text
}
```

### JSONEditor
```typescript
{
  value: string;              // JSON string
  onChange: (val) => void;    // Change handler
  height?: number;            // Editor height (px)
  error?: string;             // External error
  label?: string;             // Field label
  required?: boolean;         // Required indicator
}
```

## Exports Summary

```typescript
// From /src/components/memory/index.ts
export { FullFormModal } from './FullFormModal';
export { TimelineEventForm, KVMemoryForm, JSONEditor } from './forms';

// From /src/lib/validation/memorySchemas.ts
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
