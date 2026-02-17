# Cell Components Visual Showcase

## InlineEditCell Component

### View Mode
```
┌─────────────────────────────────────┐
│ My JIRA Ticket Title                │  <- Click to edit
└─────────────────────────────────────┘
  └─ Hover: light gray background
```

### Edit Mode
```
┌─────────────────────────────────────┐
│ My JIRA Ticket Title           ◐    │  <- Active editing with spinner
└─────────────────────────────────────┘
  └─ Blue focus ring, spinner on right
```

### Keyboard Shortcuts
- `Click` → Enter edit mode
- `Enter` → Save changes
- `Escape` → Cancel and revert
- `Blur` → Auto-save

---

## BadgeCell Component

### Event Type Badges

```
┌──────────────────┐  Blue (info)
│  Jira Ticket     │
└──────────────────┘

┌──────────────────┐  Green (music)
│  Spotify Play    │
└──────────────────┘

┌──────────────────┐  Purple (calendar)
│  Calendar Event  │
└──────────────────┘

┌──────────────────┐  Yellow (writing)
│  Journal Entry   │
└──────────────────┘

┌──────────────────┐  Gray (code)
│  Github Commit   │
└──────────────────┘

┌──────────────────┐  Slate (unknown)
│  Unknown Type    │
└──────────────────┘
```

---

## DateCell Component

### Display Format
```
2025-11-23 14:30
```

### Hover State (Tooltip)
```
     ┌──────────────┐
     │  2 hours ago │
     └──────┬───────┘
            ▼
    2025-11-23 14:30
```

### Supported Inputs
- ISO 8601: `"2025-11-23T14:30:00Z"` → `2025-11-23 14:30`
- Unix ms: `1700738400000` → `2025-11-23 14:30`
- Invalid: `"invalid"` → `-`

---

## ActionsCell Component

### Default State
```
┌──────┬──────┐
│  ✏️  │  🗑️  │  Edit | Delete
└──────┴──────┘
  └─ Hover: Blue bg  └─ Hover: Red bg
```

### Confirmation State
```
┌──────┬──────────────────────┐
│  ✏️  │  Delete? [ Yes ] [ No ] │
└──────┴──────────────────────┘
```

### Loading State (Delete in Progress)
```
┌──────┬──────────────────────┐
│  ✏️  │  Delete? [  ◐  ] [ No ] │
└──────┴──────────────────────┘
            └─ Spinner animation
```

---

## Complete Table Example

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Title                    │ Type           │ Namespace │ Date            │ Actions        │
├──────────────────────────┼────────────────┼───────────┼─────────────────┼────────────────┤
│ Fix login bug            │ Jira Ticket    │ work      │ 2025-11-23 10:30│ ✏️ 🗑️          │
│ Listen to Radiohead      │ Spotify Play   │ personal  │ 2025-11-23 11:15│ ✏️ 🗑️          │
│ Team standup meeting     │ Calendar Event │ work      │ 2025-11-23 12:00│ ✏️ 🗑️          │
│ Morning journal          │ Journal Entry  │ personal  │ 2025-11-23 08:00│ ✏️ 🗑️          │
│ Initial commit           │ Github Commit  │ code      │ 2025-11-22 16:45│ ✏️ 🗑️          │
└──────────────────────────┴────────────────┴───────────┴─────────────────┴────────────────┘
   └─ Click to edit          └─ Color badges  └─ Click to edit  └─ Hover for   └─ Edit/Delete
                                                                     relative time
```

---

## Interactive Flow: Editing a Title

### Step 1: View Mode
```
┌─────────────────────────┐
│ Fix login bug           │ <- Click anywhere
└─────────────────────────┘
```

### Step 2: Edit Mode Activated
```
┌─────────────────────────┐
│ Fix login bug           │ <- Text selected, focused
└─────────────────────────┘
  └─ Blue focus ring appears
```

### Step 3: User Types
```
┌─────────────────────────┐
│ Fix login bug in OAuth  │ <- Typing...
└─────────────────────────┘
```

### Step 4: Press Enter or Blur
```
┌─────────────────────────┐
│ Fix login bug in OAuth ◐│ <- Saving...
└─────────────────────────┘
  └─ Spinner appears
```

### Step 5: Saved Successfully
```
┌─────────────────────────┐
│ Fix login bug in OAuth  │ <- Back to view mode
└─────────────────────────┘
```

---

## Interactive Flow: Deleting an Event

### Step 1: Default State
```
Actions: [ ✏️ ] [ 🗑️ ]
```

### Step 2: Click Delete
```
Actions: [ ✏️ ] Delete? [ Yes ] [ No ]
```

### Step 3: Click Yes
```
Actions: [ ✏️ ] Delete? [  ◐  ] [ No ]
         └─ Spinner while deleting
```

### Step 4: Deleted Successfully
```
Row removed from table
```

### Alternative: Click No
```
Actions: [ ✏️ ] [ 🗑️ ]
         └─ Back to default state
```

---

## Color Palette

```css
/* Blue - JIRA Tickets */
.badge-jira {
  background: #DBEAFE; /* blue-100 */
  color: #1E40AF;      /* blue-800 */
  border: #BFDBFE;     /* blue-200 */
}

/* Green - Spotify */
.badge-spotify {
  background: #D1FAE5; /* green-100 */
  color: #166534;      /* green-800 */
  border: #A7F3D0;     /* green-200 */
}

/* Purple - Calendar */
.badge-calendar {
  background: #E9D5FF; /* purple-100 */
  color: #6B21A8;      /* purple-800 */
  border: #D8B4FE;     /* purple-200 */
}

/* Yellow - Journal */
.badge-journal {
  background: #FEF9C3; /* yellow-100 */
  color: #854D0E;      /* yellow-800 */
  border: #FEF08A;     /* yellow-200 */
}

/* Gray - GitHub */
.badge-github {
  background: #F3F4F6; /* gray-100 */
  color: #1F2937;      /* gray-800 */
  border: #E5E7EB;     /* gray-200 */
}
```

---

## Accessibility Features

### Keyboard Navigation
```
Tab → Move between cells
Enter → Activate edit mode (in InlineEditCell)
Escape → Cancel edit mode
Space → Click buttons (Edit/Delete)
```

### Focus Indicators
```
┌─────────────────────────┐
│ Fix login bug           │ <- 2px blue ring around focused element
└─────────────────────────┘
  └─ Visible on keyboard navigation
```

### Screen Reader Announcements
- "Edit Title" button has title="Edit event"
- "Delete" button has title="Delete event"
- Loading states could announce "Deleting..." (future enhancement)

---

## Error Handling

### InlineEditCell: Save Failed
```
1. User edits title: "New Title"
2. Press Enter → API call fails
3. Alert appears: "Failed to save title. Please try again."
4. Value reverts to: "Old Title"
```

### ActionsCell: Delete Failed
```
1. User clicks Delete → "Delete? Yes / No"
2. Click Yes → API call fails
3. Alert appears: "Failed to delete event. Please try again."
4. Confirmation dialog closes
```

---

## Performance Characteristics

### InlineEditCell
- **Typing:** No re-renders (local state only)
- **Save:** Single API call, no debouncing needed
- **Cancel:** Instant (no API call)

### BadgeCell
- **Rendering:** Pure component, O(1) color lookup
- **Memory:** Static color map, no dynamic allocation

### DateCell
- **Formatting:** date-fns (tree-shaken to ~2KB)
- **Tooltip:** Only renders on hover
- **Memoization:** Can add useMemo if needed

### ActionsCell
- **Confirmation:** Local state (no table re-render)
- **Delete:** Single API call
- **Icons:** Lucide React (tree-shaken SVGs)

---

## Browser Compatibility

- Chrome 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Edge 90+ ✓

**Note:** Uses modern React (v19) and CSS features. No IE11 support.

---

## Mobile Responsiveness

All components are mobile-ready:
- Touch targets: 44x44px minimum (buttons)
- Responsive text sizing
- Touch-friendly edit activation
- Mobile keyboard support

**Future Enhancement:** Could add long-press for edit mode on mobile.
