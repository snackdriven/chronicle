# Memory Forms Testing Checklist

## Overview
This checklist covers all testing scenarios for the modal and forms system (Agent 3 deliverables).

## Component Files Created
- `/src/lib/validation/memorySchemas.ts` - Zod validation schemas
- `/src/components/memory/FullFormModal.tsx` - Headless UI modal
- `/src/components/memory/forms/JSONEditor.tsx` - Monaco JSON editor
- `/src/components/memory/forms/TimelineEventForm.tsx` - Timeline event form
- `/src/components/memory/forms/KVMemoryForm.tsx` - KV memory form
- `/src/components/memory/MemoryFormsDemo.tsx` - Demo/example usage

## Testing Instructions

### 1. Visual Testing (Manual)
Run the demo to test the UI:

```bash
# Add to src/App.tsx temporarily:
import { MemoryFormsDemo } from './components/memory/MemoryFormsDemo';

# In your component tree:
<MemoryFormsDemo />
```

### 2. TimelineEventForm Validation Tests

#### Test Case 1: Required Fields
- [ ] Open create modal
- [ ] Leave type empty -> Should show error "Event type is required"
- [ ] Leave timestamp empty -> Should show error
- [ ] Fill required fields -> Errors disappear

#### Test Case 2: Type Dropdown
- [ ] All event types appear: jira_ticket, spotify_play, calendar_event, journal_entry, github_commit
- [ ] Can select each type
- [ ] Selected type is submitted in form data

#### Test Case 3: Timestamp Input
- [ ] datetime-local input appears
- [ ] Defaults to current time on create
- [ ] Can select past/future dates
- [ ] Time component works (hours/minutes)

#### Test Case 4: Title Validation
- [ ] Optional field (no error when empty)
- [ ] Can enter up to 200 characters
- [ ] Error appears if exceeding 200 characters

#### Test Case 5: Namespace Validation
- [ ] Optional field (no error when empty)
- [ ] Accepts lowercase letters: "test" ✓
- [ ] Accepts numbers: "test123" ✓
- [ ] Accepts hyphens: "test-namespace" ✓
- [ ] Accepts underscores: "test_namespace" ✓
- [ ] Rejects uppercase: "Test" ✗ (should show error)
- [ ] Rejects special chars: "test@namespace" ✗ (should show error)

#### Test Case 6: Metadata JSON Editor
- [ ] Monaco editor loads
- [ ] Syntax highlighting works
- [ ] Valid JSON: `{"key": "value"}` ✓
- [ ] Invalid JSON shows error below editor
- [ ] Empty JSON is allowed
- [ ] Complex nested objects work
- [ ] Arrays work: `{"tags": ["a", "b"]}`

### 3. KVMemoryForm Validation Tests

#### Test Case 7: Key Validation
- [ ] Required field (error when empty)
- [ ] Accepts letters: "userPreferences" ✓
- [ ] Accepts numbers: "config123" ✓
- [ ] Accepts dots: "user.preferences" ✓
- [ ] Accepts hyphens: "user-preferences" ✓
- [ ] Accepts underscores: "user_preferences" ✓
- [ ] Rejects spaces: "user preferences" ✗
- [ ] Rejects special chars: "user@preferences" ✗
- [ ] Max 100 characters enforced

#### Test Case 8: Value JSON Editor
- [ ] Monaco editor loads
- [ ] Required field (error when empty)
- [ ] Valid JSON required
- [ ] Objects work: `{"theme": "dark"}`
- [ ] Arrays work: `["item1", "item2"]`
- [ ] Primitives work: `"string"`, `123`, `true`
- [ ] Invalid JSON shows error

#### Test Case 9: TTL with Unit Conversion
- [ ] TTL is optional (no error when empty)
- [ ] Number input accepts positive integers only
- [ ] Unit selector has: Seconds, Minutes, Hours, Days
- [ ] Unit selector disabled when TTL empty
- [ ] Unit selector enabled when TTL has value
- [ ] Conversion logic:
  - [ ] 60 seconds = 60 seconds
  - [ ] 5 minutes = 300 seconds
  - [ ] 2 hours = 7200 seconds
  - [ ] 1 day = 86400 seconds

### 4. FullFormModal Tests

#### Test Case 10: Modal Behavior
- [ ] Modal opens with smooth fade-in animation
- [ ] Modal closes with fade-out animation
- [ ] Backdrop has blur effect
- [ ] Click outside modal closes it
- [ ] Press Escape key closes modal
- [ ] Close X button works
- [ ] Modal title displays correctly

#### Test Case 11: Focus Management
- [ ] Focus trapped inside modal when open
- [ ] Tab key cycles through form fields
- [ ] First field focused on open
- [ ] Focus returns to trigger button on close

### 5. Form Submission Tests

#### Test Case 12: Create Mode
- [ ] Form shows "Create Event" / "Create Memory" button
- [ ] All fields empty initially
- [ ] Submit button enabled
- [ ] On submit: button shows "Saving..." and disables
- [ ] On success: modal closes
- [ ] On error: modal stays open, error displayed

#### Test Case 13: Edit Mode
- [ ] Form shows "Update Event" / "Update Memory" button
- [ ] Fields pre-filled with initial data
- [ ] Timestamp converted to datetime-local format
- [ ] JSON fields show formatted JSON
- [ ] Can modify all fields
- [ ] Submit sends updated data

#### Test Case 14: Cancel/Close Behavior
- [ ] Cancel button closes modal
- [ ] No API call made
- [ ] Form data discarded
- [ ] Next open shows fresh form (create mode)

### 6. JSON Editor Specific Tests

#### Test Case 15: Monaco Editor Features
- [ ] Line numbers visible
- [ ] JSON syntax highlighting
- [ ] Bracket matching
- [ ] Auto-indentation
- [ ] Can copy/paste JSON
- [ ] Height prop respected (200px for events, 250px for KV)

#### Test Case 16: JSON Validation
- [ ] Real-time validation on change
- [ ] Error message appears below editor
- [ ] Error message clear and helpful
- [ ] Valid JSON clears error
- [ ] Empty JSON clears error

### 7. Integration Tests

#### Test Case 17: Timeline Event Form Integration
```typescript
const handleSubmit = async (data: TimelineEventFormData) => {
  console.log(data);
  // Should output:
  // {
  //   timestamp: "2025-11-23T14:30:00.000Z",
  //   type: "jira_ticket",
  //   title: "Test event",
  //   namespace: "development",
  //   metadata: { ticketId: "PROJ-123" }
  // }
};
```

#### Test Case 18: KV Memory Form Integration
```typescript
const handleSubmit = async (data: KVMemoryFormData) => {
  console.log(data);
  // Should output:
  // {
  //   key: "user.preferences",
  //   value: { theme: "dark" },
  //   namespace: "settings",
  //   ttl: 604800 // 7 days in seconds
  // }
  // Note: ttlUnit removed, ttl converted to seconds
};
```

## Accessibility Tests

### Test Case 19: Keyboard Navigation
- [ ] All form fields keyboard accessible
- [ ] Tab order logical
- [ ] Enter submits form
- [ ] Escape closes modal
- [ ] Arrow keys work in dropdowns

### Test Case 20: Screen Reader
- [ ] Form labels read correctly
- [ ] Required field indicators announced
- [ ] Error messages announced
- [ ] Modal title announced on open

## Performance Tests

### Test Case 21: Large JSON Performance
- [ ] Monaco editor handles large JSON (1000+ lines)
- [ ] Validation doesn't freeze UI
- [ ] Smooth typing experience

### Test Case 22: Rapid Open/Close
- [ ] Can rapidly open/close modal without issues
- [ ] No memory leaks
- [ ] Animations remain smooth

## Browser Compatibility

### Test Case 23: Cross-Browser
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] datetime-local input works in all browsers

## Error Handling

### Test Case 24: Network Errors
- [ ] Submit fails -> error message shown
- [ ] Modal stays open
- [ ] Can retry submission
- [ ] Can close modal

### Test Case 25: Validation Errors
- [ ] Multiple errors shown simultaneously
- [ ] Errors positioned near relevant fields
- [ ] Error styling clear (red borders/text)
- [ ] Errors clear on fix

## Pass Criteria

All checkboxes must be checked for full approval.

### Critical (Must Pass)
- All required field validations work
- JSON editor validates correctly
- Modal opens/closes properly
- Form submission calls onSubmit with correct data
- TTL conversion works correctly

### Important (Should Pass)
- Keyboard navigation works
- Error messages are clear
- Animations are smooth
- Edit mode pre-fills data

### Nice to Have (Can Have Minor Issues)
- Screen reader support perfect
- Cross-browser 100% identical
- Very large JSON performance

## Time Spent
- Schema definition: 20 minutes
- Modal component: 25 minutes
- JSON Editor: 20 minutes
- TimelineEventForm: 40 minutes
- KVMemoryForm: 35 minutes
- Total: ~2 hours

## Next Steps (For Other Agents)

**Agent 2 (Tables):**
- Import FullFormModal and forms
- Add Create/Edit buttons to tables
- Wire up modal state (isOpen, onClose)
- Pass selected item to form as initialData

**Agent 4 (API Integration):**
- Create API hooks: useCreateTimelineEvent, useUpdateTimelineEvent, etc.
- Connect form onSubmit to API calls
- Handle success/error states
- Refresh table data after mutation

**Agent 5 (UI Polish):**
- Add loading states
- Add success toasts
- Add error toasts
- Improve animations
