#!/usr/bin/env tsx
/**
 * Validate JIRA Import Plan
 *
 * Quick validation script to verify the import plan is correct
 * before executing the actual import.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ImportPlan {
  ready: boolean;
  totalTickets: number;
  totalBatches: number;
  entities: {
    people: { count: number; list: any[] };
    projects: { count: number; list: any[] };
    components: { count: number; list: any[] };
  };
  deduplicationMap: Record<string, string>;
  batches: Array<{
    batchNumber: number;
    ticketKeys: string[];
    ticketCount: number;
  }>;
  dateRange: { earliest: string; latest: string };
  errors: string[];
  warnings: string[];
}

async function main() {
  console.log('Validating JIRA Import Plan...\n');

  // Load import plan
  const planPath = join(__dirname, '../data/jira-import-plan.json');
  const plan: ImportPlan = JSON.parse(readFileSync(planPath, 'utf-8'));

  let isValid = true;

  // Check 1: Ready flag
  console.log(`✓ Ready flag: ${plan.ready ? 'YES' : 'NO'}`);
  if (!plan.ready) {
    console.error('  ERROR: Import plan is not ready!');
    isValid = false;
  }

  // Check 2: Total tickets
  console.log(`✓ Total tickets: ${plan.totalTickets}`);
  if (plan.totalTickets !== 700) {
    console.error(`  ERROR: Expected 700 tickets, got ${plan.totalTickets}`);
    isValid = false;
  }

  // Check 3: Total batches
  console.log(`✓ Total batches: ${plan.totalBatches}`);
  if (plan.totalBatches !== 7) {
    console.error(`  ERROR: Expected 7 batches, got ${plan.totalBatches}`);
    isValid = false;
  }

  // Check 4: Batch ticket counts
  let totalTicketsInBatches = 0;
  const allTicketKeys = new Set<string>();

  for (const batch of plan.batches) {
    totalTicketsInBatches += batch.ticketCount;

    // Check for duplicate ticket keys
    for (const key of batch.ticketKeys) {
      if (allTicketKeys.has(key)) {
        console.error(`  ERROR: Duplicate ticket key found: ${key}`);
        isValid = false;
      }
      allTicketKeys.add(key);
    }

    // Check batch ticket count matches array length
    if (batch.ticketKeys.length !== batch.ticketCount) {
      console.error(`  ERROR: Batch ${batch.batchNumber} count mismatch: ${batch.ticketKeys.length} vs ${batch.ticketCount}`);
      isValid = false;
    }
  }

  console.log(`✓ Total tickets in batches: ${totalTicketsInBatches}`);
  if (totalTicketsInBatches !== plan.totalTickets) {
    console.error(`  ERROR: Batch total (${totalTicketsInBatches}) doesn't match plan total (${plan.totalTickets})`);
    isValid = false;
  }

  // Check 5: Entities
  console.log(`✓ People count: ${plan.entities.people.count}`);
  console.log(`✓ Projects count: ${plan.entities.projects.count}`);
  console.log(`✓ Components count: ${plan.entities.components.count}`);

  if (plan.entities.people.count !== plan.entities.people.list.length) {
    console.error(`  ERROR: People count mismatch`);
    isValid = false;
  }

  if (plan.entities.projects.count !== plan.entities.projects.list.length) {
    console.error(`  ERROR: Projects count mismatch`);
    isValid = false;
  }

  // Check 6: Deduplication map
  console.log(`✓ Deduplication map entries: ${Object.keys(plan.deduplicationMap).length}`);

  // Check 7: Date range
  console.log(`✓ Date range: ${plan.dateRange.earliest} to ${plan.dateRange.latest}`);

  // Check 8: Errors and warnings
  console.log(`✓ Errors: ${plan.errors.length}`);
  console.log(`✓ Warnings: ${plan.warnings.length}`);

  if (plan.errors.length > 0) {
    console.error('\nErrors found in import plan:');
    plan.errors.forEach(e => console.error(`  - ${e}`));
    isValid = false;
  }

  if (plan.warnings.length > 0) {
    console.warn('\nWarnings found in import plan:');
    plan.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (isValid) {
    console.log('✓ VALIDATION PASSED - Import plan is ready!');
    console.log('='.repeat(60));
    console.log('\nNext step: pnpm import:jira');
    process.exit(0);
  } else {
    console.error('✗ VALIDATION FAILED - Fix errors before importing!');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});
