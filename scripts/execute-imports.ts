/**
 * Sequential Import Execution Script
 *
 * Executes the prepared JIRA import:
 * 1. Creates Person entities
 * 2. Creates Project entities
 * 3. Imports timeline events in batches
 * 4. Creates relations
 * 5. Verifies data integrity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeTimelineEvent } from '../src/storage/timeline.js';
import { createEntity, createRelation, getEntity } from '../src/storage/entity.js';
import { getStats } from '../src/storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const JIRA_RAW_FILE = path.join(DATA_DIR, 'jira-tickets-raw.json');
const JIRA_PLAN_FILE = path.join(DATA_DIR, 'jira-import-plan.json');

const BATCH_SIZE = 100;

interface JiraTicket {
  key: string;
  project: string;
  summary: string;
  labels: string[];
  sourceFile: string;
  status: string;
  type: string;
  priority: string;
  component: string;
  created: string;
}

interface JiraImportPlan {
  ready: boolean;
  totalTickets: number;
  totalBatches: number;
  entities: {
    people: {
      count: number;
      list: Array<{
        name: string;
        email: string;
        variations: string[];
      }>;
    };
    projects: {
      count: number;
      list: Array<{
        key: string;
        name: string;
        ticketCount: number;
      }>;
    };
  };
}

/**
 * Load JIRA data
 */
function loadJiraData(): { tickets: JiraTicket[]; plan: JiraImportPlan } {
  console.log('Loading JIRA data...');

  const tickets = JSON.parse(fs.readFileSync(JIRA_RAW_FILE, 'utf-8')) as JiraTicket[];
  const plan = JSON.parse(fs.readFileSync(JIRA_PLAN_FILE, 'utf-8')) as JiraImportPlan;

  console.log(`Loaded ${tickets.length} tickets`);
  console.log(`Import plan ready: ${plan.ready}`);

  return { tickets, plan };
}

/**
 * Create Person entities
 */
function createPeople(plan: JiraImportPlan): void {
  console.log('\n=== Creating Person Entities ===');

  for (const person of plan.entities.people.list) {
    try {
      const entity = createEntity({
        type: 'person',
        name: person.name,
        properties: {
          email: person.email,
          email_variations: person.variations,
          source: 'jira_import',
        },
      }, 'jira_importer');

      console.log(`✓ Created person: ${person.name} (${entity.id})`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`  Person already exists: ${person.name}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Create Project entities
 */
function createProjects(plan: JiraImportPlan): void {
  console.log('\n=== Creating Project Entities ===');

  for (const project of plan.entities.projects.list) {
    try {
      const entity = createEntity({
        type: 'project',
        name: project.name,
        properties: {
          key: project.key,
          ticket_count: project.ticketCount,
          source: 'jira_import',
        },
      }, 'jira_importer');

      console.log(`✓ Created project: ${project.name} (${project.key}) - ${entity.id}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`  Project already exists: ${project.name}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Import tickets in batches
 */
function importTickets(tickets: JiraTicket[]): Map<string, string> {
  console.log('\n=== Importing Timeline Events ===');

  const ticketIdMap = new Map<string, string>(); // ticket key -> event ID
  const totalBatches = Math.ceil(tickets.length / BATCH_SIZE);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, tickets.length);
    const batch = tickets.slice(start, end);

    console.log(`\nBatch ${batchNum + 1}/${totalBatches}: Importing tickets ${start + 1}-${end}`);

    for (const ticket of batch) {
      try {
        // Convert created date to timestamp
        const timestamp = new Date(ticket.created).getTime();

        // Create timeline event
        const eventId = storeTimelineEvent({
          timestamp,
          type: 'jira_ticket',
          title: `${ticket.key}: ${ticket.summary}`,
          namespace: 'jira',
          metadata: {
            ticket_key: ticket.key,
            project: ticket.project,
            status: ticket.status,
            type: ticket.type,
            priority: ticket.priority,
            component: ticket.component,
            labels: ticket.labels,
            source_file: ticket.sourceFile,
          },
        });

        ticketIdMap.set(ticket.key, eventId);
      } catch (error: any) {
        console.error(`  ✗ Failed to import ${ticket.key}: ${error.message}`);
      }
    }

    console.log(`  ✓ Batch ${batchNum + 1} complete (${batch.length} tickets)`);
  }

  console.log(`\n✓ Imported ${ticketIdMap.size} timeline events`);
  return ticketIdMap;
}

/**
 * Create relations between entities (Person → Project)
 * Note: Events link to entities through metadata, not through the relations table
 */
function createRelations(plan: JiraImportPlan): void {
  console.log('\n=== Creating Entity Relations ===');

  let relationCount = 0;
  const errors: string[] = [];

  // Get person entity (there's only one: Kayla Gilbert)
  const person = plan.entities.people.list[0];

  // Create "works_on" relations between person and each project
  for (const project of plan.entities.projects.list) {
    try {
      createRelation({
        from: person.name,
        relation: 'works_on',
        to: project.name,
        properties: {
          role: 'QA Engineer',
          ticket_count: project.ticketCount,
          source: 'jira_import',
        },
      }, 'jira_importer');
      relationCount++;

      console.log(`  ✓ ${person.name} works_on ${project.name} (${project.ticketCount} tickets)`);
    } catch (error: any) {
      errors.push(`Failed to create relation ${person.name} → ${project.name}: ${error.message}`);
    }
  }

  console.log(`\n✓ Created ${relationCount} entity relations`);

  if (errors.length > 0) {
    console.log(`\nRelation errors (${errors.length}):`);
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\nNote: Events are linked to entities through metadata (ticket_key, project, etc.)');
}

/**
 * Verify import integrity
 */
function verifyImport(expectedTickets: number): void {
  console.log('\n=== Verifying Import ===');

  const stats = getStats();

  console.log('Database statistics:');
  console.log(`  Events: ${stats.eventCount}`);
  console.log(`  Entities: ${stats.entityCount}`);
  console.log(`  Relations: ${stats.relationCount}`);
  console.log(`  Memories: ${stats.memoryCount}`);

  // Check event count
  const eventsMismatch = stats.eventCount !== expectedTickets;
  if (eventsMismatch) {
    console.log(`  ⚠️  Expected ${expectedTickets} events, found ${stats.eventCount}`);
  } else {
    console.log(`  ✓ Event count matches expected (${expectedTickets})`);
  }

  // Check entity count (1 person + 4 projects = 5)
  const expectedEntities = 5;
  const entitiesMismatch = stats.entityCount !== expectedEntities;
  if (entitiesMismatch) {
    console.log(`  ⚠️  Expected ${expectedEntities} entities, found ${stats.entityCount}`);
  } else {
    console.log(`  ✓ Entity count matches expected (${expectedEntities})`);
  }

  // Check relation count (1 person × 4 projects = 4 relations)
  const expectedRelations = 4;
  const relationsMismatch = stats.relationCount !== expectedRelations;
  if (relationsMismatch) {
    console.log(`  ⚠️  Expected ${expectedRelations} relations, found ${stats.relationCount}`);
  } else {
    console.log(`  ✓ Relation count matches expected (${expectedRelations})`);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('=== JIRA Sequential Import Execution ===\n');

  try {
    // Get initial stats
    const initialStats = getStats();
    console.log('Initial database state:');
    console.log(`  Events: ${initialStats.eventCount}`);
    console.log(`  Entities: ${initialStats.entityCount}`);
    console.log(`  Relations: ${initialStats.relationCount}\n`);

    // Load data
    const { tickets, plan } = loadJiraData();

    if (!plan.ready) {
      throw new Error('Import plan is not ready. Please run preparation scripts first.');
    }

    // Create entities
    createPeople(plan);
    createProjects(plan);

    // Import timeline events
    const ticketIdMap = importTickets(tickets);

    // Create entity relations (Person → Project)
    createRelations(plan);

    // Verify import
    verifyImport(tickets.length);

    console.log('\n=== Import Complete ===');
    console.log(`Total tickets imported: ${ticketIdMap.size}`);
    console.log(`Total entities created: ${plan.entities.people.count + plan.entities.projects.count}`);

    const finalStats = getStats();
    console.log('\nFinal database state:');
    console.log(`  Events: ${finalStats.eventCount} (+${finalStats.eventCount - initialStats.eventCount})`);
    console.log(`  Entities: ${finalStats.entityCount} (+${finalStats.entityCount - initialStats.entityCount})`);
    console.log(`  Relations: ${finalStats.relationCount} (+${finalStats.relationCount - initialStats.relationCount})`);

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
