# Memory Manager Table Cell Components

Type-safe, reusable cell components for the memory manager table using TanStack React Table.

## Components Overview

### InlineEditCell
Click-to-edit cell component for editable text fields (title, namespace).

**Features:**
- Click to enter edit mode
- Auto-focus and select text on edit
- Enter to save, Escape to cancel
- Blur saves changes automatically
- Loading spinner during save
- Automatic rollback on error
- Empty value validation

**Usage:**
```tsx
import { InlineEditCell } from './cells';

const columns = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: (props) => <InlineEditCell {...props} field="title" />
  }
];
```

**Props:**
- `field: string` - The field name to update ('title' | 'namespace')
- Standard TanStack React Table cell context props

**Table Meta Requirements:**
- `updateEvent(id: string, updates: object): Promise<void>`

---

### BadgeCell
Type-based badge with color coding for event types.

**Features:**
- Color-coded badges by event type
- Automatic Title Case formatting
- Border styling for clarity

**Color Mapping:**
| Event Type | Color |
|------------|-------|
| jira_ticket | Blue |
| spotify_play | Green |
| calendar_event | Purple |
| journal_entry | Yellow |
| github_commit | Gray |
| (default) | Slate |

**Usage:**
```tsx
import { BadgeCell } from './cells';

const columns = [
  {
    accessorKey: 'eventType',
    header: 'Type',
    cell: (props) => <BadgeCell {...props} />
  }
];
```

---

### DateCell
Formatted timestamp with relative time tooltip on hover.

**Features:**
- Formats timestamps as: `yyyy-MM-dd HH:mm`
- Supports both string (ISO 8601) and number (Unix timestamp)
- Hover shows relative time (e.g., "2 hours ago")
- Graceful handling of invalid dates

**Usage:**
```tsx
import { DateCell } from './cells';

const columns = [
  {
    accessorKey: 'timestamp',
    header: 'Date',
    cell: (props) => <DateCell {...props} />
  }
];
```

**Supported Formats:**
- ISO 8601 strings: `"2025-11-23T10:30:00Z"`
- Unix timestamps (ms): `1700738400000`
- Invalid dates display as: `-`

---

### ActionsCell
Edit and delete action buttons with confirmation dialog.

**Features:**
- Edit button (opens edit modal)
- Delete button with inline confirmation
- Loading state during delete
- Error handling with user feedback

**Usage:**
```tsx
import { ActionsCell } from './cells';

const columns = [
  {
    id: 'actions',
    header: 'Actions',
    cell: (props) => <ActionsCell {...props} />
  }
];
```

**Table Meta Requirements:**
- `openEditModal(row: TData): void`
- `deleteEvent(id: string): Promise<void>`

**Interaction Flow:**
1. Click delete button
2. Inline confirmation appears: "Delete? Yes / No"
3. Click "Yes" - Shows loading spinner, calls deleteEvent
4. Click "No" - Cancels confirmation

---

## Installation

### Dependencies
```bash
pnpm add -w date-fns@^3.0.0 @tanstack/react-table@^8.0.0
```

### Import
```tsx
// Import all cells
import {
  InlineEditCell,
  BadgeCell,
  DateCell,
  ActionsCell
} from '@/components/memory/cells';

// Or import individually
import { InlineEditCell } from '@/components/memory/cells/InlineEditCell';
```

---

## Table Meta Interface

All cell components expect certain methods to be available via `table.options.meta`:

```typescript
interface TableMeta {
  // Required by InlineEditCell
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;

  // Required by ActionsCell
  openEditModal: (event: Event) => void;
  deleteEvent: (id: string) => Promise<void>;
}

// Usage in table setup
const table = useReactTable({
  data,
  columns,
  meta: {
    updateEvent: async (id, updates) => { /* ... */ },
    openEditModal: (event) => { /* ... */ },
    deleteEvent: async (id) => { /* ... */ },
  }
});
```

---

## Example: Complete Column Definition

```tsx
import { createColumnHelper } from '@tanstack/react-table';
import {
  InlineEditCell,
  BadgeCell,
  DateCell,
  ActionsCell
} from '@/components/memory/cells';

interface Event {
  id: string;
  title: string;
  eventType: string;
  namespace: string;
  timestamp: string | number;
}

const columnHelper = createColumnHelper<Event>();

export const columns = [
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (props) => <InlineEditCell {...props} field="title" />
  }),
  columnHelper.accessor('eventType', {
    header: 'Type',
    cell: (props) => <BadgeCell {...props} />
  }),
  columnHelper.accessor('namespace', {
    header: 'Namespace',
    cell: (props) => <InlineEditCell {...props} field="namespace" />
  }),
  columnHelper.accessor('timestamp', {
    header: 'Date',
    cell: (props) => <DateCell {...props} />
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (props) => <ActionsCell {...props} />
  })
];
```

---

## Styling

All components use Tailwind CSS with the following patterns:

### Color Palette
- **Blue**: Primary actions, info
- **Green**: Success states, spotify
- **Purple**: Calendar events
- **Yellow**: Journal entries
- **Gray**: Neutral, github
- **Red**: Delete actions, errors

### Interactive States
- **Hover**: Background color change + color intensification
- **Focus**: Blue ring (ring-2 ring-blue-500)
- **Disabled**: Reduced opacity + cursor-not-allowed
- **Loading**: Spin animation + cursor-wait

### Accessibility
- Focus rings on all interactive elements
- Title attributes for tooltips
- Semantic button elements
- Keyboard navigation support (Enter, Escape)

---

## Testing Checklist

### InlineEditCell
- [ ] Click to edit enters edit mode
- [ ] Auto-focus and text selection works
- [ ] Enter key saves changes
- [ ] Escape key cancels and reverts
- [ ] Blur saves changes
- [ ] Empty values are rejected
- [ ] Loading spinner shows during save
- [ ] Error handling reverts to original value

### BadgeCell
- [ ] All event types have correct colors
- [ ] Unknown types use slate color
- [ ] Text formatting is Title Case
- [ ] Border styling is visible

### DateCell
- [ ] ISO strings format correctly
- [ ] Unix timestamps format correctly
- [ ] Hover shows relative time tooltip
- [ ] Tooltip positioning is correct
- [ ] Invalid dates show "-"

### ActionsCell
- [ ] Edit button calls openEditModal
- [ ] Delete button shows confirmation
- [ ] "Yes" button calls deleteEvent
- [ ] "No" button cancels confirmation
- [ ] Loading spinner shows during delete
- [ ] Error handling shows alert

---

## Performance Considerations

### InlineEditCell
- Uses `useState` for local state (no external re-renders during typing)
- Debouncing not needed (save only on blur/enter)
- Automatic cleanup on unmount

### DateCell
- date-fns tree-shakeable (only imports format, formatDistanceToNow)
- No re-formatting on every render (memoization via useMemo could be added if needed)
- Tooltip only renders on hover

### ActionsCell
- Confirmation state is local (doesn't affect table state)
- Optimistic UI not implemented (could be added for better UX)

---

## Future Enhancements

### Potential Additions
1. **SelectCell** - Dropdown for status/priority fields
2. **TagsCell** - Multi-tag input with autocomplete
3. **LinkCell** - External links with icon
4. **JSONCell** - Expandable JSON viewer for data field
5. **SearchHighlightCell** - Highlight search terms in text

### Improvements
1. Add debouncing to InlineEditCell for expensive save operations
2. Implement optimistic updates in ActionsCell
3. Add keyboard shortcuts (Ctrl+E for edit, Del for delete)
4. Add undo/redo support
5. Add bulk actions (multi-select + batch delete)

---

## File Structure

```
src/components/memory/cells/
├── InlineEditCell.tsx    # Click-to-edit cell (45 min)
├── BadgeCell.tsx         # Type badge cell (15 min)
├── DateCell.tsx          # Formatted date cell (15 min)
├── ActionsCell.tsx       # Edit/delete actions (20 min)
├── index.ts              # Exports all cells (5 min)
└── README.md             # This file
```

**Total Development Time: ~1.5 hours**
