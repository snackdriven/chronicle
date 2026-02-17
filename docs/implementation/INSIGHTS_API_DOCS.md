# Insights API Documentation

## Overview

The Insights API provides analytics and pattern analysis for JIRA work data stored in Memory Shack. All endpoints return JIRA ticket statistics and trends.

**Base URL:** `http://localhost:3002/api/insights`

**All responses follow this format:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

## Endpoints

### 1. Work Patterns

**Endpoint:** `GET /api/insights/work-patterns`

**Description:** Analyze work patterns over a specified date range.

**Query Parameters:**
- `start` (required): Start date in YYYY-MM-DD format
- `end` (required): End date in YYYY-MM-DD format

**Example Request:**
```bash
curl "http://localhost:3002/api/insights/work-patterns?start=2025-01-01&end=2025-12-31"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "totalTickets": 501,
    "daysInRange": 365,
    "daysWithTickets": 138,
    "avgPerDay": 3.63,
    "avgPerWeek": 9.61,
    "ticketsPerDay": [
      { "date": "2025-01-08", "count": 1 },
      { "date": "2025-02-21", "count": 1 }
      // ... more dates
    ],
    "busiestDays": [
      { "date": "2025-03-15", "count": 45 },
      { "date": "2025-04-12", "count": 38 }
      // ... top 10 days
    ]
  }
}
```

**Use Cases:**
- Identify work intensity patterns
- Find busiest work days
- Calculate average workload
- Visualize work distribution over time

---

### 2. Project Distribution

**Endpoint:** `GET /api/insights/project-distribution`

**Description:** Get ticket distribution across all JIRA projects.

**Query Parameters:** None

**Example Request:**
```bash
curl "http://localhost:3002/api/insights/project-distribution"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 700,
    "projectCount": 4,
    "projects": [
      {
        "project": "WRKA",
        "count": 400,
        "percentage": 57.14
      },
      {
        "project": "WMB",
        "count": 100,
        "percentage": 14.29
      },
      {
        "project": "RNP",
        "count": 100,
        "percentage": 14.29
      },
      {
        "project": "CP",
        "count": 100,
        "percentage": 14.29
      }
    ]
  }
}
```

**Use Cases:**
- Understand project workload distribution
- Identify primary work focus areas
- Generate project allocation reports

---

### 3. Velocity

**Endpoint:** `GET /api/insights/velocity`

**Description:** Analyze ticket completion velocity over time.

**Query Parameters:**
- `period` (optional): Grouping period - one of `day`, `week`, `month` (default: `week`)

**Example Request:**
```bash
curl "http://localhost:3002/api/insights/velocity?period=week"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "period": "week",
    "groupLabel": "week",
    "avgCompletedPerPeriod": 9.41,
    "velocity": [
      {
        "period": "2024-W06",
        "completed": 1,
        "total": 1,
        "completionRate": 100
      },
      {
        "period": "2024-W07",
        "completed": 3,
        "total": 3,
        "completionRate": 100
      }
      // ... more periods
    ]
  }
}
```

**Period Formats:**
- `day`: YYYY-MM-DD (e.g., "2024-03-15")
- `week`: YYYY-WNN (e.g., "2024-W11" for week 11)
- `month`: YYYY-MM (e.g., "2024-03")

**Use Cases:**
- Track completion velocity trends
- Identify productivity patterns
- Calculate sprint/weekly averages
- Measure completion rates over time

---

### 4. Components

**Endpoint:** `GET /api/insights/components`

**Description:** Get top components by ticket count.

**Query Parameters:**
- `limit` (optional): Maximum number of components to return (default: 20)

**Example Request:**
```bash
curl "http://localhost:3002/api/insights/components?limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalTicketsWithComponents": 600,
    "componentCount": 8,
    "components": [
      {
        "component": "NHHA",
        "count": 210,
        "percentage": 35
      },
      {
        "component": "OC TAR",
        "count": 177,
        "percentage": 29.5
      },
      {
        "component": "OC Warmline",
        "count": 100,
        "percentage": 16.67
      }
      // ... more components
    ]
  }
}
```

**Use Cases:**
- Identify most active components
- Understand system/module workload distribution
- Focus testing and QA efforts

---

### 5. Labels

**Endpoint:** `GET /api/insights/labels`

**Description:** Get most common JIRA labels with usage counts.

**Query Parameters:**
- `limit` (optional): Maximum number of labels to return (default: 20)

**Example Request:**
```bash
curl "http://localhost:3002/api/insights/labels?limit=15"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalLabels": 666,
    "uniqueLabels": 19,
    "ticketsWithLabels": 700,
    "labels": [
      {
        "label": "NHHA",
        "count": 209,
        "percentage": 31.38
      },
      {
        "label": "TAR",
        "count": 176,
        "percentage": 26.43
      },
      {
        "label": "URP",
        "count": 73,
        "percentage": 10.96
      }
      // ... more labels
    ]
  }
}
```

**Notes:**
- A single ticket can have multiple labels
- Percentages are calculated against `totalLabels` (not ticket count)
- `ticketsWithLabels` shows how many tickets have at least one label

**Use Cases:**
- Track topic/feature frequency
- Identify common themes in work
- Tag-based reporting and analysis

---

### 6. Status Distribution

**Endpoint:** `GET /api/insights/status-distribution`

**Description:** Get ticket distribution by status.

**Query Parameters:** None

**Example Request:**
```bash
curl "http://localhost:3002/api/insights/status-distribution"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 700,
    "statusCount": 4,
    "statuses": [
      {
        "status": "Done",
        "count": 687,
        "percentage": 98.14
      },
      {
        "status": "Backlog",
        "count": 9,
        "percentage": 1.29
      },
      {
        "status": "To Do",
        "count": 3,
        "percentage": 0.43
      },
      {
        "status": "In Review",
        "count": 1,
        "percentage": 0.14
      }
    ]
  }
}
```

**Use Cases:**
- Understand work completion rates
- Identify bottlenecks (high counts in In Progress/Review)
- Track backlog size

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400): Invalid query parameters
- `INTERNAL_ERROR` (500): Server-side error

---

## Data Source

All insights are generated from JIRA tickets imported via the Memory Shack import system. The data comes from the `timeline_events` table where `type = 'jira_ticket'`.

**Current Dataset (as of Phase 5):**
- Total JIRA tickets: 700 (after deduplication)
- Projects: WRKA (400), WMB (100), RNP (100), CP (100)
- Status: 687 Done, 9 Backlog, 3 To Do, 1 In Review
- Components: 8 unique components
- Labels: 19 unique labels across 666 total label instances

---

## Integration Examples

### JavaScript/TypeScript
```typescript
async function getProjectDistribution() {
  const response = await fetch('http://localhost:3002/api/insights/project-distribution');
  const data = await response.json();

  if (data.success) {
    console.log('Projects:', data.data.projects);
  }
}
```

### Python
```python
import requests

response = requests.get('http://localhost:3002/api/insights/velocity?period=month')
data = response.json()

if data['success']:
    for period in data['data']['velocity']:
        print(f"{period['period']}: {period['completed']} tickets completed")
```

### curl
```bash
# Get work patterns for Q1 2025
curl -s "http://localhost:3002/api/insights/work-patterns?start=2025-01-01&end=2025-03-31" | jq .

# Get top 5 components
curl -s "http://localhost:3002/api/insights/components?limit=5" | jq .
```

---

## Future Enhancements

Planned additions for Wave 1B and beyond:
- Time-series charts for work patterns
- Burndown/burnup chart data
- Sprint velocity comparisons
- Team member contribution analysis (when entity relations are added)
- Custom date range support for velocity
- Export capabilities (CSV, JSON)

---

## Related Documentation

- [HTTP API README](./HTTP_API_README.md) - Main API documentation
- [JIRA Import Guide](./QUICK_START_JIRA_IMPORT.md) - How to import JIRA data
- [Phase 5 Completion Report](./PHASE5_COMPLETE.md) - Implementation details
