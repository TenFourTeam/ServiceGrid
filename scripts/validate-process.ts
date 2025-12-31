#!/usr/bin/env node
/**
 * Process Validation CLI
 * 
 * Usage:
 *   npx ts-node scripts/validate-process.ts --all
 *   npx ts-node scripts/validate-process.ts lead_generation
 *   npx ts-node scripts/validate-process.ts site_assessment
 */

import { 
  validateProcessImplementation, 
  validateAllProcesses,
  printValidationResult,
  printValidationSummary 
} from '../src/lib/ai-agent/process-validator';
import { ALL_PROCESS_IDS } from '../src/lib/ai-agent/process-ids';

const args = process.argv.slice(2);
const processId = args[0];

if (!processId || processId === '--help' || processId === '-h') {
  console.log('Process Validation CLI');
  console.log('');
  console.log('Usage:');
  console.log('  npx ts-node scripts/validate-process.ts <process_id>');
  console.log('  npx ts-node scripts/validate-process.ts --all');
  console.log('');
  console.log('Available processes:');
  ALL_PROCESS_IDS.forEach(id => {
    console.log(`  - ${id}`);
  });
  process.exit(0);
}

if (processId === '--all') {
  console.log('\n🔍 Validating all processes...\n');
  const summary = validateAllProcesses();
  printValidationSummary(summary);
  
  // Exit with error if any required checks failed
  const hasFailures = summary.completeProcesses < summary.totalProcesses;
  process.exit(hasFailures ? 1 : 0);
} else {
  if (!ALL_PROCESS_IDS.includes(processId as any)) {
    console.error(`Error: Process '${processId}' not found in registry`);
    console.log('\nAvailable processes:');
    ALL_PROCESS_IDS.forEach(id => console.log(`  - ${id}`));
    process.exit(1);
  }
  
  const result = validateProcessImplementation(processId);
  printValidationResult(result);
  process.exit(result.isComplete ? 0 : 1);
}
