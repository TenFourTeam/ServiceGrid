#!/usr/bin/env node
/**
 * Health Check CLI
 * 
 * Run universal health checks across all systems.
 * 
 * Usage:
 *   npx tsx scripts/health-check.ts --all
 *   npx tsx scripts/health-check.ts --edge-functions
 *   npx tsx scripts/health-check.ts --database --security
 *   npx tsx scripts/health-check.ts --verbose
 */

import { runHealthCheck, formatHealthReport, SystemKey } from '../src/lib/verification/health-check';

const args = process.argv.slice(2);

// Parse arguments
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

// System flags
const systemFlags: Record<string, SystemKey> = {
  '--edge-functions': 'edge_function',
  '--edge': 'edge_function',
  '-e': 'edge_function',
  '--database': 'database',
  '--db': 'database',
  '-d': 'database',
  '--security': 'security',
  '--sec': 'security',
  '-s': 'security',
  '--testing': 'testing',
  '--test': 'testing',
  '-t': 'testing',
  '--alignment': 'alignment',
  '--align': 'alignment',
  '-A': 'alignment',
  '--intent': 'intent',
  '-i': 'intent',
};

function printHelp() {
  console.log(`
🏥 Universal Health Check CLI

Usage:
  npx tsx scripts/health-check.ts [options]

Options:
  --all, -a           Run all system validators (default)
  --edge-functions    Run edge function validator
  --database, --db    Run database validator
  --security, --sec   Run security validator
  --testing, --test   Run testing validator
  --alignment, --align Run alignment validator (DIY/DWY/DFY consistency)
  --intent, -i        Run intent pattern validator
  --verbose, -v       Show detailed output
  --help, -h          Show this help message

Examples:
  npx tsx scripts/health-check.ts --all
  npx tsx scripts/health-check.ts --edge-functions --verbose
  npx tsx scripts/health-check.ts --database --security
  npx tsx scripts/health-check.ts --alignment

Exit Codes:
  0  All checks passed (no critical issues, score >= 60%)
  1  Critical issues found or score < 60%
`);
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }
  
  // Determine which systems to check
  const systems: SystemKey[] = [];
  
  for (const arg of args) {
    if (systemFlags[arg]) {
      systems.push(systemFlags[arg]);
    }
  }
  
  // Default to all systems if none specified or --all flag
  const runAll = args.includes('--all') || args.includes('-a') || systems.length === 0;
  const systemsToRun = runAll ? undefined : systems;
  
  console.log('\n🏥 Starting Universal Health Check...\n');
  
  if (systemsToRun) {
    console.log(`Systems: ${systemsToRun.join(', ')}`);
  } else {
    console.log('Systems: all');
  }
  
  try {
    const report = await runHealthCheck({ 
      systems: systemsToRun,
      verbose 
    });
    
    // Format and print the report
    const formattedReport = formatHealthReport(report, verbose);
    console.log(formattedReport);
    
    // Exit with appropriate code
    const passed = report.criticalIssues.length === 0 && report.overallScore >= 60;
    
    if (passed) {
      console.log('✅ Health check passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Health check failed!\n');
      if (report.criticalIssues.length > 0) {
        console.log(`   ${report.criticalIssues.length} critical issue(s) found`);
      }
      if (report.overallScore < 60) {
        console.log(`   Overall score (${report.overallScore}%) is below threshold (60%)`);
      }
      console.log('');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check failed with error:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
