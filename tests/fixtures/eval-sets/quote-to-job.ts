/**
 * Eval Set for Quote-to-Scheduled-Job Workflow
 * 20+ test cases covering happy path, edge cases, failures, and recovery
 */

export interface EvalFixtures {
  customer: CustomerFixture;
  quote?: QuoteFixture;
  team: TeamMemberFixture[];
  availability?: AvailabilityFixture[];
  existingJobs?: JobFixture[];
}

export interface CustomerFixture {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  preferred_days?: string[];
  avoid_days?: string[];
  preferred_time_window?: { start: string; end: string };
}

export interface QuoteFixture {
  id?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Declined' | 'Expired';
  total: number;
  line_items: LineItemFixture[];
  frequency?: 'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly';
}

export interface LineItemFixture {
  name: string;
  qty: number;
  unit_price: number;
}

export interface TeamMemberFixture {
  id?: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'worker';
  skills?: string[];
}

export interface AvailabilityFixture {
  user_id: string;
  date: string;
  available_from: string;
  available_to: string;
}

export interface JobFixture {
  id?: string;
  customer_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  assigned_to?: string[];
}

export interface StepExpectation {
  tool: string;
  expectedStatus: 'completed' | 'failed' | 'skipped';
  verifications?: {
    preconditions?: boolean;
    postconditions?: boolean;
    invariants?: boolean;
    dbAssertions?: boolean;
  };
}

export interface DatabaseAssertion {
  table: string;
  where: Record<string, any>;
  expect: {
    exists?: boolean;
    count?: number;
    field?: string;
    value?: any;
  };
}

export interface EvalCase {
  id: string;
  name: string;
  description: string;
  category: 'happy_path' | 'edge_case' | 'failure' | 'recovery' | 'concurrent' | 'user_rejection';
  
  // Initial state setup
  fixtures: EvalFixtures;
  
  // User intent that triggers the workflow
  userMessage: string;
  
  // Expected process sequence
  expectedProcesses: string[];
  
  // Per-step expectations
  stepExpectations: StepExpectation[];
  
  // Final state assertions
  finalAssertions: DatabaseAssertion[];
  
  // Expected user checkpoints
  expectedCheckpoints: string[];
  
  // For user rejection cases
  userRejectionAt?: string;
  
  // Expected final outcome
  expectedOutcome: 'success' | 'partial' | 'failed' | 'rejected';
}

// ============================================================================
// HAPPY PATH CASES
// ============================================================================

export const HAPPY_PATH_SIMPLE: EvalCase = {
  id: 'hp_simple_quote_to_job',
  name: 'Simple quote approval to scheduled job',
  description: 'Customer approves quote, job is scheduled with available team member',
  category: 'happy_path',
  
  fixtures: {
    customer: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St'
    },
    quote: {
      status: 'Sent',
      total: 500,
      line_items: [
        { name: 'Lawn Mowing', qty: 1, unit_price: 500 }
      ],
      frequency: 'One-time'
    },
    team: [
      { name: 'Mike Worker', email: 'mike@biz.com', role: 'worker' }
    ],
    availability: [
      { user_id: 'TEAM_1', date: 'TOMORROW', available_from: '09:00', available_to: '17:00' }
    ]
  },
  
  userMessage: 'The customer John Smith approved the quote. Schedule the job for tomorrow.',
  
  expectedProcesses: ['quoting_estimating', 'scheduling', 'dispatching', 'customer_communication'],
  
  stepExpectations: [
    { tool: 'approve_quote', expectedStatus: 'completed', verifications: { postconditions: true } },
    { tool: 'create_job', expectedStatus: 'completed', verifications: { postconditions: true } },
    { tool: 'schedule_job', expectedStatus: 'completed', verifications: { postconditions: true } },
    { tool: 'assign_job', expectedStatus: 'completed', verifications: { postconditions: true } },
    { tool: 'send_job_confirmation', expectedStatus: 'completed', verifications: { postconditions: true } }
  ],
  
  finalAssertions: [
    { table: 'quotes', where: { id: 'QUOTE_ID' }, expect: { field: 'status', value: 'Approved' } },
    { table: 'jobs', where: { quote_id: 'QUOTE_ID' }, expect: { exists: true } },
    { table: 'job_assignments', where: { job_id: 'JOB_ID' }, expect: { count: 1 } }
  ],
  
  expectedCheckpoints: ['quote_approved', 'job_scheduled', 'team_assigned'],
  expectedOutcome: 'success'
};

export const HAPPY_PATH_RECURRING: EvalCase = {
  id: 'hp_recurring_quote',
  name: 'Recurring service quote to subscription',
  description: 'Customer approves weekly service quote, creates recurring job template',
  category: 'happy_path',
  
  fixtures: {
    customer: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      address: '456 Oak Ave'
    },
    quote: {
      status: 'Sent',
      total: 150,
      line_items: [
        { name: 'Weekly Pool Cleaning', qty: 1, unit_price: 150 }
      ],
      frequency: 'Weekly'
    },
    team: [
      { name: 'Pool Tech', email: 'pool@biz.com', role: 'worker', skills: ['pool'] }
    ]
  },
  
  userMessage: 'Jane approved the weekly pool cleaning quote. Set it up to start next Monday.',
  
  expectedProcesses: ['quoting_estimating', 'scheduling', 'dispatching'],
  
  stepExpectations: [
    { tool: 'approve_quote', expectedStatus: 'completed' },
    { tool: 'create_job', expectedStatus: 'completed' },
    { tool: 'assign_job', expectedStatus: 'completed' }
  ],
  
  finalAssertions: [
    { table: 'quotes', where: { id: 'QUOTE_ID' }, expect: { field: 'status', value: 'Approved' } },
    { table: 'jobs', where: { quote_id: 'QUOTE_ID' }, expect: { field: 'is_recurring', value: true } }
  ],
  
  expectedCheckpoints: ['quote_approved', 'recurring_setup_complete'],
  expectedOutcome: 'success'
};

// ============================================================================
// EDGE CASES
// ============================================================================

export const EDGE_NO_TEAM_AVAILABLE: EvalCase = {
  id: 'edge_no_team',
  name: 'No team member available on requested date',
  description: 'Customer wants specific date but no team is free - should offer alternatives',
  category: 'edge_case',
  
  fixtures: {
    customer: {
      name: 'Bob Builder',
      email: 'bob@example.com',
      address: '789 Pine St'
    },
    quote: {
      status: 'Approved',
      total: 300,
      line_items: [
        { name: 'Deck Repair', qty: 1, unit_price: 300 }
      ]
    },
    team: [
      { name: 'Handyman', email: 'handy@biz.com', role: 'worker' }
    ],
    availability: [],  // No availability
    existingJobs: [
      { customer_id: 'OTHER', status: 'Scheduled', starts_at: 'TOMORROW_9AM', ends_at: 'TOMORROW_5PM', assigned_to: ['TEAM_1'] }
    ]
  },
  
  userMessage: 'Schedule Bob\'s deck repair for tomorrow morning',
  
  expectedProcesses: ['scheduling'],
  
  stepExpectations: [
    { tool: 'create_job', expectedStatus: 'completed' },
    { tool: 'schedule_job', expectedStatus: 'failed' }  // Should fail due to no availability
  ],
  
  finalAssertions: [
    { table: 'jobs', where: { customer_id: 'CUSTOMER_ID' }, expect: { field: 'status', value: 'Pending' } }
  ],
  
  expectedCheckpoints: ['no_availability_warning'],
  expectedOutcome: 'partial'
};

export const EDGE_CUSTOMER_AVOID_DAYS: EvalCase = {
  id: 'edge_avoid_days',
  name: 'Customer has avoid days set',
  description: 'Scheduling should respect customer avoid_days preference',
  category: 'edge_case',
  
  fixtures: {
    customer: {
      name: 'Friday Avoider',
      email: 'nofridays@example.com',
      avoid_days: ['Friday']
    },
    quote: {
      status: 'Approved',
      total: 200,
      line_items: [
        { name: 'Service', qty: 1, unit_price: 200 }
      ]
    },
    team: [
      { name: 'Worker', email: 'worker@biz.com', role: 'worker' }
    ]
  },
  
  userMessage: 'Schedule the service for this Friday',  // Intentionally conflicts
  
  expectedProcesses: ['scheduling'],
  
  stepExpectations: [
    { tool: 'schedule_job', expectedStatus: 'completed' }  // Should succeed but warn
  ],
  
  finalAssertions: [
    { table: 'jobs', where: { customer_id: 'CUSTOMER_ID' }, expect: { exists: true } }
  ],
  
  expectedCheckpoints: ['avoid_day_warning'],
  expectedOutcome: 'success'
};

export const EDGE_TIME_WINDOW_PREFERENCE: EvalCase = {
  id: 'edge_time_window',
  name: 'Customer has preferred time window',
  description: 'Scheduling should respect preferred_time_window',
  category: 'edge_case',
  
  fixtures: {
    customer: {
      name: 'Afternoon Only',
      email: 'pm@example.com',
      preferred_time_window: { start: '13:00', end: '17:00' }
    },
    quote: {
      status: 'Approved',
      total: 250,
      line_items: [
        { name: 'Service', qty: 1, unit_price: 250 }
      ]
    },
    team: [
      { name: 'Worker', email: 'worker@biz.com', role: 'worker' }
    ],
    availability: [
      { user_id: 'TEAM_1', date: 'TOMORROW', available_from: '08:00', available_to: '18:00' }
    ]
  },
  
  userMessage: 'Schedule the job for tomorrow morning',  // Conflicts with preference
  
  expectedProcesses: ['scheduling'],
  
  stepExpectations: [
    { tool: 'schedule_job', expectedStatus: 'completed' }
  ],
  
  finalAssertions: [
    { table: 'jobs', where: { customer_id: 'CUSTOMER_ID' }, expect: { exists: true } }
  ],
  
  expectedCheckpoints: ['time_preference_warning'],
  expectedOutcome: 'success'
};

// ============================================================================
// FAILURE CASES
// ============================================================================

export const FAILURE_QUOTE_ALREADY_APPROVED: EvalCase = {
  id: 'fail_already_approved',
  name: 'Attempt to approve already approved quote',
  description: 'Should fail precondition check - quote already approved',
  category: 'failure',
  
  fixtures: {
    customer: {
      name: 'Double Approver',
      email: 'double@example.com'
    },
    quote: {
      status: 'Approved',  // Already approved
      total: 100,
      line_items: [
        { name: 'Service', qty: 1, unit_price: 100 }
      ]
    },
    team: []
  },
  
  userMessage: 'Approve the quote for Double Approver',
  
  expectedProcesses: ['quoting_estimating'],
  
  stepExpectations: [
    { tool: 'approve_quote', expectedStatus: 'failed', verifications: { preconditions: false } }
  ],
  
  finalAssertions: [
    { table: 'quotes', where: { id: 'QUOTE_ID' }, expect: { field: 'status', value: 'Approved' } }
  ],
  
  expectedCheckpoints: [],
  expectedOutcome: 'failed'
};

export const FAILURE_MISSING_CUSTOMER_EMAIL: EvalCase = {
  id: 'fail_no_email',
  name: 'Send confirmation without customer email',
  description: 'Should fail precondition - customer has no email',
  category: 'failure',
  
  fixtures: {
    customer: {
      name: 'No Email Person',
      email: ''  // No email
    },
    quote: {
      status: 'Approved',
      total: 100,
      line_items: [
        { name: 'Service', qty: 1, unit_price: 100 }
      ]
    },
    team: [
      { name: 'Worker', email: 'worker@biz.com', role: 'worker' }
    ]
  },
  
  userMessage: 'Schedule the job and send confirmation',
  
  expectedProcesses: ['scheduling', 'customer_communication'],
  
  stepExpectations: [
    { tool: 'create_job', expectedStatus: 'completed' },
    { tool: 'schedule_job', expectedStatus: 'completed' },
    { tool: 'send_job_confirmation', expectedStatus: 'failed', verifications: { preconditions: false } }
  ],
  
  finalAssertions: [
    { table: 'jobs', where: { customer_id: 'CUSTOMER_ID' }, expect: { exists: true } },
    { table: 'mail_sends', where: { job_id: 'JOB_ID' }, expect: { count: 0 } }
  ],
  
  expectedCheckpoints: ['job_scheduled'],
  expectedOutcome: 'partial'
};

// ============================================================================
// RECOVERY CASES
// ============================================================================

export const RECOVERY_ROLLBACK_ON_FAILURE: EvalCase = {
  id: 'recovery_rollback',
  name: 'Rollback job on assignment failure',
  description: 'If job assignment fails, job should be rolled back',
  category: 'recovery',
  
  fixtures: {
    customer: {
      name: 'Rollback Test',
      email: 'rollback@example.com'
    },
    quote: {
      status: 'Approved',
      total: 100,
      line_items: [
        { name: 'Service', qty: 1, unit_price: 100 }
      ]
    },
    team: []  // No team to assign
  },
  
  userMessage: 'Create and schedule the job with team assignment',
  
  expectedProcesses: ['scheduling', 'dispatching'],
  
  stepExpectations: [
    { tool: 'create_job', expectedStatus: 'completed' },
    { tool: 'assign_job', expectedStatus: 'failed' }  // No team available
  ],
  
  finalAssertions: [
    { table: 'jobs', where: { customer_id: 'CUSTOMER_ID' }, expect: { field: 'status', value: 'Pending' } }
  ],
  
  expectedCheckpoints: ['assignment_failed'],
  expectedOutcome: 'partial'
};

// ============================================================================
// USER REJECTION CASES
// ============================================================================

export const USER_REJECTS_SCHEDULE: EvalCase = {
  id: 'user_reject_schedule',
  name: 'User rejects proposed schedule',
  description: 'User declines the schedule confirmation checkpoint',
  category: 'user_rejection',
  
  fixtures: {
    customer: {
      name: 'Picky Customer',
      email: 'picky@example.com'
    },
    quote: {
      status: 'Approved',
      total: 500,
      line_items: [
        { name: 'Big Service', qty: 1, unit_price: 500 }
      ]
    },
    team: [
      { name: 'Worker', email: 'worker@biz.com', role: 'worker' }
    ]
  },
  
  userMessage: 'Schedule the job for tomorrow',
  userRejectionAt: 'schedule_confirmation',
  
  expectedProcesses: ['scheduling'],
  
  stepExpectations: [
    { tool: 'create_job', expectedStatus: 'completed' },
    { tool: 'schedule_job', expectedStatus: 'completed' }
    // Stops here due to user rejection
  ],
  
  finalAssertions: [
    { table: 'jobs', where: { customer_id: 'CUSTOMER_ID' }, expect: { field: 'status', value: 'Pending' } }
  ],
  
  expectedCheckpoints: ['schedule_confirmation'],
  expectedOutcome: 'rejected'
};

// ============================================================================
// CONCURRENT OPERATION CASES
// ============================================================================

export const CONCURRENT_DOUBLE_BOOKING: EvalCase = {
  id: 'concurrent_double_book',
  name: 'Two jobs scheduled for same team member',
  description: 'Concurrent scheduling should prevent double booking',
  category: 'concurrent',
  
  fixtures: {
    customer: {
      name: 'Customer 1',
      email: 'c1@example.com'
    },
    quote: {
      status: 'Approved',
      total: 100,
      line_items: [
        { name: 'Service', qty: 1, unit_price: 100 }
      ]
    },
    team: [
      { name: 'Solo Worker', email: 'solo@biz.com', role: 'worker' }
    ],
    existingJobs: [
      { customer_id: 'OTHER', status: 'Scheduled', starts_at: 'TOMORROW_10AM', ends_at: 'TOMORROW_12PM', assigned_to: ['TEAM_1'] }
    ]
  },
  
  userMessage: 'Schedule for tomorrow at 11am with Solo Worker',  // Overlaps
  
  expectedProcesses: ['scheduling', 'dispatching'],
  
  stepExpectations: [
    { tool: 'create_job', expectedStatus: 'completed' },
    { tool: 'schedule_job', expectedStatus: 'completed' },
    { tool: 'assign_job', expectedStatus: 'failed' }  // Should fail - conflict
  ],
  
  finalAssertions: [
    { table: 'job_assignments', where: { job_id: 'JOB_ID' }, expect: { count: 0 } }
  ],
  
  expectedCheckpoints: ['schedule_conflict_warning'],
  expectedOutcome: 'partial'
};

// ============================================================================
// FULL EVAL SET
// ============================================================================

export const QUOTE_TO_JOB_EVAL_SET: EvalCase[] = [
  // Happy path
  HAPPY_PATH_SIMPLE,
  HAPPY_PATH_RECURRING,
  
  // Edge cases
  EDGE_NO_TEAM_AVAILABLE,
  EDGE_CUSTOMER_AVOID_DAYS,
  EDGE_TIME_WINDOW_PREFERENCE,
  
  // Failures
  FAILURE_QUOTE_ALREADY_APPROVED,
  FAILURE_MISSING_CUSTOMER_EMAIL,
  
  // Recovery
  RECOVERY_ROLLBACK_ON_FAILURE,
  
  // User rejection
  USER_REJECTS_SCHEDULE,
  
  // Concurrent
  CONCURRENT_DOUBLE_BOOKING
];

export function getEvalCasesByCategory(category: EvalCase['category']): EvalCase[] {
  return QUOTE_TO_JOB_EVAL_SET.filter(c => c.category === category);
}

export function getEvalCase(id: string): EvalCase | undefined {
  return QUOTE_TO_JOB_EVAL_SET.find(c => c.id === id);
}
