#!/usr/bin/env tsx
/**
 * JIRA Import Preparation Script
 *
 * Phase 3-4 - Agent B: Parse JIRA data and build entity deduplication plan
 * WITHOUT writing to database yet. This is the PREPARATION phase.
 *
 * Source: Multiple markdown files with JIRA tickets
 * Target: Build import plan with deduplication strategy
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root is 3 levels up from scripts/
const PROJECT_ROOT = join(__dirname, '../../..');

// Source markdown files
const MARKDOWN_FILES = [
  'kayla-tickets-wrka.md',
  'kayla-tickets-wmb.md',
  'kayla-tickets-cp.md',
  'kayla-tickets-historical.md',
];

interface RawTicket {
  key: string;           // e.g., "WRKA-3808"
  project: string;       // e.g., "WRKA"
  summary: string;       // Ticket title
  status: string;        // Backlog, To Do, Done, etc.
  type?: string;         // Sub-task, Bug, Task
  priority?: string;     // Medium, High, Low
  component?: string;    // OC O&E Mobile, NHHA, etc.
  labels: string[];      // Array of labels
  created?: string;      // YYYY-MM-DD
  sourceFile: string;    // Which markdown file it came from
}

interface Person {
  name: string;
  email?: string;
  variations: string[]; // All name/email variations found
}

interface Project {
  key: string;
  name: string;
  ticketCount: number;
}

interface ImportPlan {
  ready: boolean;
  totalTickets: number;
  totalBatches: number;
  entities: {
    people: {
      count: number;
      list: Person[];
    };
    projects: {
      count: number;
      list: Project[];
    };
    components: {
      count: number;
      list: string[];
    };
  };
  deduplicationMap: Record<string, string>; // email/variation -> canonical name
  batches: Array<{
    batchNumber: number;
    ticketKeys: string[];
    ticketCount: number;
    dateRange?: { earliest: string; latest: string };
  }>;
  dateRange: {
    earliest: string;
    latest: string;
  };
  statusBreakdown: Record<string, number>;
  componentBreakdown: Record<string, number>;
  projectBreakdown: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * Parse markdown file and extract tickets
 */
function parseMarkdownFile(filepath: string): RawTicket[] {
  const content = readFileSync(filepath, 'utf-8');
  const tickets: RawTicket[] = [];

  const lines = content.split('\n');
  let currentTicket: Partial<RawTicket> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match ticket header: **[[WRKA-3808]]** - Summary text
    const ticketMatch = line.match(/^\*\*\[\[([A-Z]+-\d+)\]\]\*\*\s*-\s*(.+)$/);
    if (ticketMatch) {
      // Save previous ticket if exists
      if (currentTicket?.key) {
        tickets.push(currentTicket as RawTicket);
      }

      const [, key, summary] = ticketMatch;
      const project = key.split('-')[0];

      currentTicket = {
        key,
        project,
        summary,
        labels: [],
        sourceFile: filepath,
      };
      continue;
    }

    // Parse ticket properties
    if (currentTicket && line.startsWith('- ')) {
      const propLine = line.substring(2).trim();

      // Status
      if (propLine.startsWith('Status: ')) {
        currentTicket.status = propLine.substring(8);
      }

      // Type | Priority
      else if (propLine.startsWith('Type: ')) {
        const typeMatch = propLine.match(/Type: (.+?)\s*\|\s*Priority: (.+)/);
        if (typeMatch) {
          currentTicket.type = typeMatch[1];
          currentTicket.priority = typeMatch[2];
        }
      }

      // Component
      else if (propLine.startsWith('Component: ')) {
        currentTicket.component = propLine.substring(11);
      }

      // Labels
      else if (propLine.startsWith('Labels: ')) {
        const labelsStr = propLine.substring(8);
        currentTicket.labels = labelsStr.split(',').map(l => l.trim()).filter(Boolean);
      }

      // Created date
      else if (propLine.startsWith('Created: ')) {
        currentTicket.created = propLine.substring(9);
      }
    }
  }

  // Save last ticket
  if (currentTicket?.key) {
    tickets.push(currentTicket as RawTicket);
  }

  return tickets;
}

/**
 * Extract unique projects from tickets
 */
function extractProjects(tickets: RawTicket[]): Project[] {
  const projectMap = new Map<string, Project>();

  for (const ticket of tickets) {
    if (!projectMap.has(ticket.project)) {
      projectMap.set(ticket.project, {
        key: ticket.project,
        name: getProjectName(ticket.project),
        ticketCount: 0,
      });
    }

    const project = projectMap.get(ticket.project)!;
    project.ticketCount++;
  }

  return Array.from(projectMap.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Get full project name from key
 */
function getProjectName(key: string): string {
  const names: Record<string, string> = {
    'WRKA': 'Workforce Management - Core',
    'WMB': 'Workforce Management - Business',
    'CP': 'Chorus Platform',
    'RNP': 'Historical Projects (RNP)',
    // Add more as discovered
  };

  return names[key] || key;
}

/**
 * Extract unique components from tickets
 */
function extractComponents(tickets: RawTicket[]): string[] {
  const components = new Set<string>();

  for (const ticket of tickets) {
    if (ticket.component) {
      components.add(ticket.component);
    }
  }

  return Array.from(components).sort();
}

/**
 * Build deduplication map for people
 * Since we don't have assignee/reporter in this data, we'll focus on
 * extracting people from component names and labels
 */
function buildDeduplicationMap(tickets: RawTicket[]): Record<string, string> {
  const deduplicationMap: Record<string, string> = {};

  // For now, we'll just set up Kayla Gilbert as the primary person
  // In a real scenario, we'd extract from assignee/reporter fields
  deduplicationMap['kayla@joinchorus.com'] = 'Kayla Gilbert';
  deduplicationMap['kayla.gilbert@chorus.com'] = 'Kayla Gilbert';
  deduplicationMap['Kayla Gilbert'] = 'Kayla Gilbert';

  return deduplicationMap;
}

/**
 * Extract unique people from tickets
 */
function extractPeople(tickets: RawTicket[], deduplicationMap: Record<string, string>): Person[] {
  // For this dataset, we primarily have Kayla Gilbert
  // In a full JIRA export, we'd extract from assignee, reporter, comments, etc.

  const people: Person[] = [
    {
      name: 'Kayla Gilbert',
      email: 'kayla@joinchorus.com',
      variations: [
        'kayla@joinchorus.com',
        'kayla.gilbert@chorus.com',
        'Kayla Gilbert',
      ],
    },
  ];

  return people;
}

/**
 * Split tickets into batches
 */
function createBatches(tickets: RawTicket[], batchSize: number = 100): ImportPlan['batches'] {
  // Sort by created date (oldest first)
  const sorted = [...tickets].sort((a, b) => {
    const dateA = a.created || '9999-12-31';
    const dateB = b.created || '9999-12-31';
    return dateA.localeCompare(dateB);
  });

  const batches: ImportPlan['batches'] = [];

  for (let i = 0; i < sorted.length; i += batchSize) {
    const batchTickets = sorted.slice(i, i + batchSize);
    const ticketKeys = batchTickets.map(t => t.key);

    // Calculate date range for batch
    const dates = batchTickets.map(t => t.created).filter(Boolean) as string[];
    const dateRange = dates.length > 0 ? {
      earliest: dates[0],
      latest: dates[dates.length - 1],
    } : undefined;

    batches.push({
      batchNumber: Math.floor(i / batchSize) + 1,
      ticketKeys,
      ticketCount: batchTickets.length,
      dateRange,
    });
  }

  return batches;
}

/**
 * Calculate status breakdown
 */
function calculateStatusBreakdown(tickets: RawTicket[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const ticket of tickets) {
    const status = ticket.status || 'Unknown';
    breakdown[status] = (breakdown[status] || 0) + 1;
  }

  return breakdown;
}

/**
 * Calculate component breakdown
 */
function calculateComponentBreakdown(tickets: RawTicket[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const ticket of tickets) {
    const component = ticket.component || 'No Component';
    breakdown[component] = (breakdown[component] || 0) + 1;
  }

  return breakdown;
}

/**
 * Calculate project breakdown
 */
function calculateProjectBreakdown(tickets: RawTicket[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const ticket of tickets) {
    breakdown[ticket.project] = (breakdown[ticket.project] || 0) + 1;
  }

  return breakdown;
}

/**
 * Get date range across all tickets
 */
function getDateRange(tickets: RawTicket[]): { earliest: string; latest: string } {
  const dates = tickets.map(t => t.created).filter(Boolean) as string[];

  if (dates.length === 0) {
    return { earliest: 'N/A', latest: 'N/A' };
  }

  const sorted = dates.sort();
  return {
    earliest: sorted[0],
    latest: sorted[sorted.length - 1],
  };
}

/**
 * Validate data quality
 */
function validateTickets(tickets: RawTicket[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const ticket of tickets) {
    // Required fields
    if (!ticket.key) {
      errors.push(`Ticket missing key`);
    }
    if (!ticket.summary) {
      errors.push(`Ticket ${ticket.key} missing summary`);
    }
    if (!ticket.status) {
      warnings.push(`Ticket ${ticket.key} missing status`);
    }
    if (!ticket.created) {
      warnings.push(`Ticket ${ticket.key} missing created date`);
    }

    // Validate key format
    if (ticket.key && !/^[A-Z]+-\d+$/.test(ticket.key)) {
      errors.push(`Ticket ${ticket.key} has invalid key format`);
    }

    // Validate date format
    if (ticket.created && !/^\d{4}-\d{2}-\d{2}$/.test(ticket.created)) {
      errors.push(`Ticket ${ticket.key} has invalid date format: ${ticket.created}`);
    }
  }

  return { errors, warnings };
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('JIRA Import Preparation - Phase 3-4 (Agent B)');
  console.log('='.repeat(80));
  console.log();

  const allTickets: RawTicket[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Parse all markdown files
  console.log('Step 1: Parsing JIRA markdown files...');
  for (const filename of MARKDOWN_FILES) {
    const filepath = join(PROJECT_ROOT, filename);

    try {
      console.log(`  - Parsing ${filename}...`);
      const tickets = parseMarkdownFile(filepath);
      console.log(`    Found ${tickets.length} tickets`);
      allTickets.push(...tickets);
    } catch (error) {
      const errMsg = `Failed to parse ${filename}: ${error}`;
      console.error(`    ERROR: ${errMsg}`);
      errors.push(errMsg);
    }
  }

  console.log(`\nTotal tickets parsed: ${allTickets.length}`);
  console.log();

  // Step 2: Validate data quality
  console.log('Step 2: Validating data quality...');
  const validation = validateTickets(allTickets);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  if (validation.errors.length > 0) {
    console.log(`  - Found ${validation.errors.length} errors`);
  }
  if (validation.warnings.length > 0) {
    console.log(`  - Found ${validation.warnings.length} warnings`);
  }
  console.log();

  // Step 3: Extract entities
  console.log('Step 3: Extracting unique entities...');

  const deduplicationMap = buildDeduplicationMap(allTickets);
  const people = extractPeople(allTickets, deduplicationMap);
  const projects = extractProjects(allTickets);
  const components = extractComponents(allTickets);

  console.log(`  - People: ${people.length}`);
  console.log(`  - Projects: ${projects.length}`);
  console.log(`  - Components: ${components.length}`);
  console.log();

  // Step 4: Create batches
  console.log('Step 4: Creating import batches...');
  const batches = createBatches(allTickets, 100);
  console.log(`  - Total batches: ${batches.length}`);
  console.log(`  - Batch size: 100 tickets`);
  console.log();

  // Step 5: Calculate statistics
  console.log('Step 5: Calculating statistics...');
  const dateRange = getDateRange(allTickets);
  const statusBreakdown = calculateStatusBreakdown(allTickets);
  const componentBreakdown = calculateComponentBreakdown(allTickets);
  const projectBreakdown = calculateProjectBreakdown(allTickets);

  console.log(`  - Date range: ${dateRange.earliest} to ${dateRange.latest}`);
  console.log(`  - Status breakdown: ${Object.keys(statusBreakdown).length} statuses`);
  console.log(`  - Component breakdown: ${Object.keys(componentBreakdown).length} components`);
  console.log();

  // Step 6: Build import plan
  console.log('Step 6: Building import plan...');
  const importPlan: ImportPlan = {
    ready: errors.length === 0,
    totalTickets: allTickets.length,
    totalBatches: batches.length,
    entities: {
      people: {
        count: people.length,
        list: people,
      },
      projects: {
        count: projects.length,
        list: projects,
      },
      components: {
        count: components.length,
        list: components,
      },
    },
    deduplicationMap,
    batches,
    dateRange,
    statusBreakdown,
    componentBreakdown,
    projectBreakdown,
    errors,
    warnings,
  };

  // Step 7: Save import plan
  const outputPath = join(__dirname, '../data/jira-import-plan.json');
  writeFileSync(outputPath, JSON.stringify(importPlan, null, 2));
  console.log(`  - Import plan saved to: ${outputPath}`);
  console.log();

  // Step 8: Save raw tickets for reference
  const ticketsPath = join(__dirname, '../data/jira-tickets-raw.json');
  writeFileSync(ticketsPath, JSON.stringify(allTickets, null, 2));
  console.log(`  - Raw tickets saved to: ${ticketsPath}`);
  console.log();

  // Print summary
  console.log('='.repeat(80));
  console.log('IMPORT PLAN SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Ready for import: ${importPlan.ready ? 'YES' : 'NO'}`);
  console.log(`Total tickets: ${importPlan.totalTickets}`);
  console.log(`Total batches: ${importPlan.totalBatches}`);
  console.log(`Date range: ${dateRange.earliest} to ${dateRange.latest}`);
  console.log();

  console.log('Entities:');
  console.log(`  - People: ${people.length}`);
  people.forEach(p => console.log(`    * ${p.name} (${p.variations.length} variations)`));
  console.log();

  console.log(`  - Projects: ${projects.length}`);
  projects.forEach(p => console.log(`    * ${p.key}: ${p.name} (${p.ticketCount} tickets)`));
  console.log();

  console.log(`  - Components: ${components.length}`);
  if (components.length <= 20) {
    components.forEach(c => console.log(`    * ${c}`));
  } else {
    components.slice(0, 10).forEach(c => console.log(`    * ${c}`));
    console.log(`    ... and ${components.length - 10} more`);
  }
  console.log();

  console.log('Status Breakdown:');
  Object.entries(statusBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const percentage = ((count / allTickets.length) * 100).toFixed(1);
      console.log(`  - ${status}: ${count} (${percentage}%)`);
    });
  console.log();

  console.log('Project Breakdown:');
  Object.entries(projectBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([project, count]) => {
      const percentage = ((count / allTickets.length) * 100).toFixed(1);
      console.log(`  - ${project}: ${count} (${percentage}%)`);
    });
  console.log();

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`));
    if (warnings.length > 10) {
      console.log(`  ... and ${warnings.length - 10} more warnings`);
    }
    console.log();
  }

  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e}`));
    console.log();
  }

  console.log('='.repeat(80));
  console.log('NEXT STEPS:');
  console.log('='.repeat(80));
  console.log();
  console.log('1. Review the import plan in: data/jira-import-plan.json');
  console.log('2. Verify entity deduplication strategy');
  console.log('3. Check for any data quality issues');
  console.log('4. Run the actual import: pnpm import:jira');
  console.log();

  // Exit with error code if not ready
  if (!importPlan.ready) {
    console.error('Import plan has errors. Fix them before proceeding.');
    process.exit(1);
  }

  console.log('Import plan is ready!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
