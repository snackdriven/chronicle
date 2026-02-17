# Memory Shack UI - Component Structure

## Page Flow

```
Dashboard (/)
    │
    ├─> Timeline Tab
    │       │
    │       └─> EventCard (click)
    │               │
    │               └─> EventExpanded (side panel)
    │                       │
    │                       ├─> Click Assignee Link
    │                       │       └─> Navigate to /entity/person/{name}
    │                       │
    │                       └─> Click Project Badge
    │                               └─> Navigate to /entity/project/{key}
    │
    └─> Other Tabs (Overview, Insights, etc.)


EntityPage (/entity/:type/:name)
    │
    ├─> EntityHeader
    │       ├─> Icon (type-specific)
    │       ├─> Name & Type Badge
    │       └─> Stats Pills
    │
    ├─> Sidebar
    │       └─> Quick Stats
    │
    └─> Main Content (Tabs)
            ├─> Timeline Tab
            │       └─> EntityTimeline
            │               └─> Event Cards (grouped by date)
            │
            ├─> Relations Tab
            │       └─> EntityRelations
            │               └─> Relation Cards (clickable links)
            │
            └─> Activity Tab (TODO)
```

## EventExpanded Component Structure

```
┌────────────────────────────────────────────────────┐
│ EventExpanded (Side Panel)                    [X] │
├────────────────────────────────────────────────────┤
│                                                    │
│  📅 Event Name                                     │
│  🕐 Date & Time  •  📋 Type                       │
│                                                    │
│  ──────────────────────────────────────────────   │
│                                                    │
│  IF type === 'calendar':                          │
│    📍 Location                                     │
│    👥 Attendees List                              │
│    📄 Description                                  │
│    ✏️  Post-Event Notes (textarea + save)         │
│                                                    │
│  IF type === 'work':                              │
│    🏢 [Project Badge] ─────> (clickable)         │
│    ⚡ Status Badge  •  Priority Badge            │
│    👤 [Assignee Card] ─────> (clickable)         │
│    📄 Description                                  │
│                                                    │
│  ELSE:                                            │
│    { JSON metadata }                              │
│                                                    │
└────────────────────────────────────────────────────┘
```

## EntityPage Layout

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  EntityHeader                                        │
│  ┌────┐                                             │
│  │ 👤 │  Kayla Gilbert              [person]        │
│  └────┘                                             │
│         📊 15 Events  •  🔗 8 Relations             │
│                                                      │
│  Properties:                                        │
│  email: kayla@example.com  •  role: developer       │
│                                                      │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  Sidebar   │  Tabs: [Timeline] [Relations] [Activity│
│            │                                         │
│  Quick     │  ┌─────────────────────────────────┐  │
│  Stats:    │  │ Friday, November 22, 2025 (3)   │  │
│            │  ├─────────────────────────────────┤  │
│  📊 15     │  │ 💼 CP-123: Fix login bug        │  │
│  Events    │  │ 🕐 9:00 AM • In Progress        │  │
│            │  └─────────────────────────────────┘  │
│  🔗 8      │  │ 💼 CP-124: Update docs         │  │
│  Relations │  │ 🕐 2:30 PM • To Do             │  │
│            │  └─────────────────────────────────┘  │
│  📋 person │  │ 📅 Team Standup                │  │
│  Type      │  │ 🕐 10:00 AM                    │  │
│            │  └─────────────────────────────────┘  │
│            │                                         │
└────────────┴─────────────────────────────────────────┘
```

## EntityRelations Component

```
┌────────────────────────────────────────┐
│ assigned_to (5)                        │
├────────────────────────────────────────┤
│  ← [👤 CP-123: Fix login bug]  →      │
│     Ticket                             │
├────────────────────────────────────────┤
│  ← [👤 CP-124: Update docs]  →        │
│     Ticket                             │
├────────────────────────────────────────┤
│  ← [👤 CP-125: Add feature]  →        │
│     Ticket                             │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ works_on (3)                           │
├────────────────────────────────────────┤
│  ← [🏢 Client Portal]  →              │
│     Project                            │
├────────────────────────────────────────┤
│  ← [🏢 NHHA]  →                       │
│     Project                            │
└────────────────────────────────────────┘
```

## Component Props

### EventExpanded
```typescript
interface EventExpandedProps {
  event: TimelineEvent;
  fullData?: Record<string, unknown>;
  onClose: () => void;
}
```

### EntityHeader
```typescript
interface EntityHeaderProps {
  entity: Entity;
  totalEvents?: number;
  totalRelations?: number;
}
```

### EntityTimeline
```typescript
interface EntityTimelineProps {
  events: EntityTimelineEvent[];
  isLoading?: boolean;
}
```

### EntityRelations
```typescript
interface EntityRelationsProps {
  relations: EntityRelation[];
  isLoading?: boolean;
  currentEntityName: string;
}
```

## State Management

### React Query Cache Structure
```
Query Cache:
├─ ['timeline', '2025-11-22']
│  └─ { groups: [...], totalEvents: 15 }
│
├─ ['entity', 'person', 'Kayla Gilbert']
│  └─ { id, type, name, properties, ... }
│
├─ ['entity', 'person', 'Kayla Gilbert', 'timeline']
│  └─ [ { id, timestamp, type, title, ... } ]
│
└─ ['entity', 'person', 'Kayla Gilbert', 'relations']
   └─ [ { from, relation, to, ... } ]
```

### URL State
```
Routes:
/                           ─> Dashboard
/entity/person/John%20Doe   ─> EntityPage (person)
/entity/project/CP          ─> EntityPage (project)
/entity/ticket/CP-123       ─> EntityPage (ticket)
```

## Color Coding

### Entity Types
- **Person:** Blue gradient (`from-blue-500 to-purple-500`)
- **Project:** Green gradient (`from-green-500 to-blue-500`)
- **Ticket:** Orange gradient (`from-orange-500 to-red-500`)
- **Tag:** Pink gradient (`from-pink-500 to-purple-500`)

### Event Types
- **Work:** Blue (`from-blue-600 to-blue-700`)
- **Calendar:** Purple (`from-purple-600 to-purple-700`)
- **Music:** Green (`from-green-600 to-green-700`)
- **Journal:** Pink (`from-pink-600 to-pink-700`)

### Status Badges
- **Completed:** Green
- **In Progress:** Cyan (pulsing)
- **To Do:** Gray
- **Blocked:** Red (pulsing)
- **Review:** Purple

### Priority Badges
- **Critical/Highest:** Red
- **High:** Orange
- **Medium:** Yellow
- **Low:** Gray

## Interaction Patterns

### Clicking Flow
1. **Dashboard > Timeline > Event Card**
   - Opens EventExpanded side panel
   - Shows type-specific details

2. **EventExpanded > Assignee Card**
   - Navigate to `/entity/person/{name}`
   - Closes side panel

3. **EventExpanded > Project Badge**
   - Navigate to `/entity/project/{key}`
   - Closes side panel

4. **EntityPage > Relations > Related Entity**
   - Navigate to `/entity/{type}/{name}`
   - Replace current page

5. **EntityPage > Back Button**
   - Navigate to `/` (Dashboard)

### Loading States
- Spinner + "Loading..." text
- Skeleton loaders (TODO)
- Cached data shown while revalidating

### Error States
- Red alert box with error icon
- Error message + retry suggestions
- "Back to Dashboard" link

### Empty States
- Large emoji icon
- "No items found" message
- Helpful description/CTA
