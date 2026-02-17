#!/usr/bin/env bash
# Memory Shack HTTP API - Comprehensive Test Script

set -e

API_URL="http://localhost:3002"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Memory Shack HTTP API Test Script ===${NC}\n"

# Helper function to test endpoint
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4

  echo -e "${BLUE}Testing: $name${NC}"

  if [ -z "$data" ]; then
    response=$(curl -s -X "$method" "$API_URL$endpoint")
  else
    response=$(curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  success=$(echo "$response" | jq -r '.success')

  if [ "$success" = "true" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "$response" | jq .
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$response" | jq .
  fi

  echo ""
}

# 1. Health Check
echo -e "${BLUE}=== 1. Health Check ===${NC}\n"
test_endpoint "Health Check" "GET" "/health"
test_endpoint "API Info" "GET" "/api"

# 2. Memory Operations
echo -e "${BLUE}=== 2. Memory Operations ===${NC}\n"

test_endpoint "Store Memory" "POST" "/api/memory" \
  '{"key": "test:hello", "value": "world", "namespace": "test"}'

test_endpoint "Retrieve Memory" "GET" "/api/memory/test:hello"

test_endpoint "Check Memory Exists" "GET" "/api/memory/test:hello/exists"

test_endpoint "Store Memory with TTL" "POST" "/api/memory" \
  '{"key": "temp:session", "value": {"user": "test"}, "ttl": 3600}'

test_endpoint "Bulk Store Memories" "POST" "/api/memory/bulk" \
  '{
    "memories": [
      {"key": "config:theme", "value": "dark"},
      {"key": "config:lang", "value": "en"}
    ]
  }'

test_endpoint "List Memories" "GET" "/api/memory/list?namespace=test"

test_endpoint "Search Memories" "GET" "/api/memory/search?q=world"

test_endpoint "Memory Stats" "GET" "/api/memory/stats"

test_endpoint "Update TTL" "PUT" "/api/memory/test:hello/ttl" \
  '{"ttl": 86400}'

test_endpoint "Delete Memory" "DELETE" "/api/memory/test:hello"

test_endpoint "Bulk Delete Memories" "DELETE" "/api/memory/bulk" \
  '{"pattern": "config:*"}'

test_endpoint "Clean Expired Memories" "POST" "/api/memory/cleanup"

# 3. Timeline Operations
echo -e "${BLUE}=== 3. Timeline Operations ===${NC}\n"

test_endpoint "Create Timeline Event" "POST" "/api/timeline" \
  '{
    "timestamp": "2025-11-22T10:00:00Z",
    "type": "test_event",
    "title": "Test Event",
    "metadata": {"source": "test-script"}
  }'

# Store event ID for later tests
event_id=$(curl -s -X POST "$API_URL/api/timeline" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-22T11:00:00Z",
    "type": "jira_ticket",
    "title": "Another Test Event",
    "metadata": {"ticket_id": "TEST-123"}
  }' | jq -r '.data.id')

echo "Created event with ID: $event_id"

test_endpoint "Get Timeline for Date" "GET" "/api/timeline/2025-11-22"

test_endpoint "Get Timeline Summary" "GET" "/api/timeline/2025-11-22/summary"

test_endpoint "Get Timeline Range" "GET" "/api/timeline/range?start=2025-11-01&end=2025-11-30"

test_endpoint "Expand Event" "POST" "/api/timeline/$event_id/expand" \
  '{
    "full_data": {
      "description": "Full event details",
      "comments": ["comment1", "comment2"]
    }
  }'

test_endpoint "Get Event with Full Details" "GET" "/api/timeline/2025-11-22/$event_id/full"

test_endpoint "Update Event" "PUT" "/api/timeline/$event_id" \
  '{"title": "Updated Test Event", "metadata": {"status": "done"}}'

test_endpoint "Delete Event" "DELETE" "/api/timeline/$event_id"

# 4. Entity Operations
echo -e "${BLUE}=== 4. Entity Operations ===${NC}\n"

test_endpoint "Create Person Entity" "POST" "/api/entities/person" \
  '{
    "name": "Test User",
    "properties": {
      "email": "test@example.com",
      "role": "tester"
    }
  }'

test_endpoint "Create Project Entity" "POST" "/api/entities/project" \
  '{
    "name": "Test Project",
    "properties": {
      "status": "active",
      "tech": ["Node.js", "SQLite"]
    }
  }'

test_endpoint "Get Entity" "GET" "/api/entities/person/Test%20User"

test_endpoint "List Entities by Type" "GET" "/api/entities/person"

test_endpoint "List All Entities" "GET" "/api/entities/all"

test_endpoint "Search Entities" "GET" "/api/entities/search?q=Test"

test_endpoint "Update Entity" "PUT" "/api/entities/person/Test%20User" \
  '{
    "properties": {
      "email": "test.updated@example.com",
      "role": "senior tester"
    },
    "change_reason": "Promotion"
  }'

test_endpoint "Get Entity Versions" "GET" "/api/entities/person/Test%20User/versions"

test_endpoint "Create Relation" "POST" "/api/entities/relations" \
  '{
    "from": "Test User",
    "relation": "assigned_to",
    "to": "Test Project",
    "properties": {"role": "lead"}
  }'

test_endpoint "Get Entity Relations" "GET" "/api/entities/person/Test%20User/relations"

test_endpoint "Get Entity Timeline" "GET" "/api/entities/person/Test%20User/timeline"

test_endpoint "Entity Stats" "GET" "/api/entities/stats"

test_endpoint "Delete Entity" "DELETE" "/api/entities/person/Test%20User"

test_endpoint "Delete Project Entity" "DELETE" "/api/entities/project/Test%20Project"

# Final Stats
echo -e "${BLUE}=== Final Database Stats ===${NC}\n"
curl -s "$API_URL/api" | jq '.data.stats'

echo -e "\n${GREEN}=== All Tests Complete ===${NC}\n"
