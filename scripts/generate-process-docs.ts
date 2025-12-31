#!/usr/bin/env node
/**
 * Process Documentation Generator
 * 
 * Generates markdown documentation for each process from registry data.
 * Usage: npx tsx scripts/generate-process-docs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PROCESS_MODULES } from '../src/lib/ai-agent/processes';
import { ALL_PROCESS_IDS, type ProcessId } from '../src/lib/ai-agent/process-ids';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '../docs/processes');

function ensureDocsDir() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
}

function generateProcessDoc(processId: ProcessId): string {
  const module = PROCESS_MODULES[processId];
  const def = module?.DEFINITION;
  const tests = module?.TESTS || { unit: [], integration: [], e2e: [] };
  const triggers = module?.TRIGGERS || { triggers: [], functions: [] };
  const pattern = module?.PATTERN;
  const contracts = module?.CONTRACTS || [];
  
  return `# ${def?.name || processId}

## Overview
- **ID:** \`${processId}\`
- **Phase:** ${def?.phase || 'Unknown'}
- **Current State:** ${def?.currentState || 'N/A'}
- **Target State:** ${def?.targetState || 'N/A'}

## SIPOC
| Element | Values |
|---------|--------|
| Suppliers | ${def?.sipoc?.suppliers?.join(', ') || 'Not defined'} |
| Inputs | ${def?.sipoc?.inputs?.join(', ') || 'Not defined'} |
| Process Steps | ${def?.sipoc?.processSteps?.join(', ') || 'Not defined'} |
| Outputs | ${def?.sipoc?.outputs?.join(', ') || 'Not defined'} |
| Customers | ${def?.sipoc?.customers?.join(', ') || 'Not defined'} |

## Sub-Steps
${def?.subSteps?.map((s: any, i: number) => `${i + 1}. **${s.name}** - ${s.description || 'No description'}`).join('\n') || 'Not defined'}

## Multi-Step Pattern
${pattern ? `- **Pattern ID:** \`${pattern.id}\`
- **Steps:** ${pattern.steps.length}
- **Estimated Duration:** ${pattern.estimatedDurationMs}ms
- **Special Card:** ${pattern.specialCardType || 'Default'}` : 'No pattern defined'}

## Tool Contracts
${contracts.length > 0 ? contracts.map((c: any) => `- \`${c.toolName}\``).join('\n') : 'No contracts defined'}

## Database Automation
### Triggers
${triggers.triggers.length > 0 ? triggers.triggers.map((t: string) => `- \`${t}\``).join('\n') : 'None'}

### Functions
${triggers.functions.length > 0 ? triggers.functions.map((f: string) => `- \`${f}\``).join('\n') : 'None'}

## Test Coverage
| Type | Status | Count |
|------|--------|-------|
| Unit | ${tests.unit.length > 0 ? '✅' : '❌'} | ${tests.unit.length} |
| Integration | ${tests.integration.length > 0 ? '✅' : '❌'} | ${tests.integration.length} |
| E2E | ${tests.e2e.length > 0 ? '✅' : '❌'} | ${tests.e2e.length} |

---
*Generated automatically by generate-process-docs.ts*
`;
}

function main() {
  console.log('📝 Generating process documentation...\n');
  ensureDocsDir();
  
  ALL_PROCESS_IDS.forEach(processId => {
    const doc = generateProcessDoc(processId);
    const filePath = path.join(DOCS_DIR, `${processId}.md`);
    fs.writeFileSync(filePath, doc);
    console.log(`  ✅ Generated: docs/processes/${processId}.md`);
  });
  
  // Generate index
  const index = `# Process Documentation Index

This documentation is auto-generated from the process registry.

## All Processes (${ALL_PROCESS_IDS.length})

${ALL_PROCESS_IDS.map((id: string) => `- [${id}](./${id}.md)`).join('\n')}

---
*Generated automatically by generate-process-docs.ts*
`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'README.md'), index);
  console.log(`  ✅ Generated: docs/processes/README.md`);
  console.log(`\n✨ Done! Generated ${ALL_PROCESS_IDS.length + 1} files.`);
}

main();
