import { AppEvent, AppState, Business, Customer, Estimate, Invoice, Job, LineItem, Money } from '@/types';
import { loadState, saveState } from './storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

function nowISO() { return new Date().toISOString(); }
function randToken(len = 20) { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 2 + len); }
function uuid() { return crypto.randomUUID(); }

function computeLineTotal(li: LineItem): Money { return Math.round(li.qty * li.unitPrice); }
function computeTotals(lineItems: LineItem[], taxRate: number, discount: Money) {
  const subtotal = lineItems.reduce((s, li) => s + computeLineTotal(li), 0);
  const tax = Math.round(subtotal * taxRate);
  const total = Math.max(0, subtotal + tax - (discount || 0));
  return { subtotal, total };
}

const defaultBusiness = (): Business => ({
  id: 'biz-1',
  name: 'TenFour Lawn',
  phone: '',
  replyToEmail: '',
  logoUrl: '',
  taxRateDefault: 0.08,
  numbering: { estPrefix: 'EST-', estSeq: 1, invPrefix: 'INV-', invSeq: 1 },
});

const initialState: AppState = loadState<AppState>() ?? {
  business: defaultBusiness(),
  customers: [],
  estimates: [],
  jobs: [],
  invoices: [],
  payments: [],
  events: [],
};

// Actions
type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'UPSERT_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; id: string }
  | { type: 'UPSERT_ESTIMATE'; payload: Estimate }
  | { type: 'UPSERT_JOB'; payload: Job }
  | { type: 'DELETE_JOB'; id: string }
  | { type: 'UPSERT_INVOICE'; payload: Invoice }
  | { type: 'ADD_EVENT'; payload: AppEvent }
  | { type: 'SET_BUSINESS'; payload: Business };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'SET_BUSINESS':
      return { ...state, business: action.payload };
    case 'UPSERT_CUSTOMER': {
      const exists = state.customers.some((c) => c.id === action.payload.id);
      const customers = exists
        ? state.customers.map((c) => (c.id === action.payload.id ? action.payload : c))
        : [action.payload, ...state.customers];
      return { ...state, customers };
    }
    case 'DELETE_CUSTOMER': {
      return { ...state, customers: state.customers.filter((c) => c.id !== action.id) };
    }
    case 'UPSERT_ESTIMATE': {
      const exists = state.estimates.some((e) => e.id === action.payload.id);
      const estimates = exists
        ? state.estimates.map((e) => (e.id === action.payload.id ? action.payload : e))
        : [action.payload, ...state.estimates];
      return { ...state, estimates };
    }
    case 'UPSERT_JOB': {
      const exists = state.jobs.some((j) => j.id === action.payload.id);
      const jobs = exists
        ? state.jobs.map((j) => (j.id === action.payload.id ? action.payload : j))
        : [action.payload, ...state.jobs];
      return { ...state, jobs };
    }
    case 'DELETE_JOB': {
      return { ...state, jobs: state.jobs.filter((j) => j.id !== action.id) };
    }
    case 'UPSERT_INVOICE': {
      const exists = state.invoices.some((i) => i.id === action.payload.id);
      const invoices = exists
        ? state.invoices.map((i) => (i.id === action.payload.id ? action.payload : i))
        : [action.payload, ...state.invoices];
      return { ...state, invoices };
    }
    case 'ADD_EVENT': {
      return { ...state, events: [action.payload, ...state.events] };
    }
    default:
      return state;
  }
}

export interface Store extends AppState {
  // helpers
  nextEstimateNumber(): string;
  nextInvoiceNumber(): string;
  upsertCustomer(c: Partial<Customer> & { name: string }): Customer;
  upsertEstimate(e: Partial<Estimate> & { customerId: string }): Estimate;
  sendEstimate(id: string): void;
  approveEstimate(id: string, name: string): void;
  convertEstimateToJob(estimateId: string, start?: Date, end?: Date, recurrence?: 'biweekly'): Job[];
  upsertJob(j: Partial<Job> & { customerId: string; startsAt: string; endsAt: string }): Job;
  updateJobStatus(id: string, status: Job['status']): void;
  deleteJob(id: string): void;
  createInvoiceFromJob(jobId: string, dueAt?: Date): Invoice;
  sendInvoice(id: string): void;
  markInvoicePaid(id: string, last4?: string): void;
  setBusiness(b: Partial<Business>): void;
  seedDemo(): void;
  overwriteState(state: AppState): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => saveState(state), [state]);

  const api: Store = useMemo(() => ({
    ...state,
    nextEstimateNumber() {
      const n = state.business.numbering.estSeq;
      const num = `${state.business.numbering.estPrefix}${String(n).padStart(3, '0')}`;
      const business = { ...state.business, numbering: { ...state.business.numbering, estSeq: n + 1 } };
      dispatch({ type: 'SET_BUSINESS', payload: business });
      return num;
    },
    nextInvoiceNumber() {
      const n = state.business.numbering.invSeq;
      const num = `${state.business.numbering.invPrefix}${String(n).padStart(3, '0')}`;
      const business = { ...state.business, numbering: { ...state.business.numbering, invSeq: n + 1 } };
      dispatch({ type: 'SET_BUSINESS', payload: business });
      return num;
    },
    upsertCustomer(c) {
      const customer: Customer = {
        id: c.id ?? uuid(),
        businessId: state.business.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
      };
      dispatch({ type: 'UPSERT_CUSTOMER', payload: customer });
      return customer;
    },
    upsertEstimate(e) {
      const lineItems = (e.lineItems ?? []).map((li) => ({
        id: li.id ?? uuid(),
        name: li.name ?? '',
        qty: li.qty ?? 1, // qty hidden in UI; default to 1
        unit: li.unit,
        unitPrice: li.unitPrice ?? 0,
        lineTotal: computeLineTotal({ ...li, id: li.id ?? '', name: li.name ?? '', qty: li.qty ?? 1, unit: li.unit, unitPrice: li.unitPrice ?? 0 }),
      }));
      const taxRate = e.taxRate ?? state.business.taxRateDefault;
      const discount = e.discount ?? 0;
      const { subtotal, total } = computeTotals(lineItems, taxRate, discount);
      const estimate: Estimate = {
        id: e.id ?? uuid(),
        number: e.number ?? api.nextEstimateNumber(),
        businessId: state.business.id,
        customerId: e.customerId,
        address: e.address,
        lineItems,
        taxRate,
        discount,

        // New fields with defaults
        paymentTerms: e.paymentTerms ?? 'due_on_receipt',
        frequency: e.frequency ?? 'one-off',
        depositRequired: e.depositRequired ?? false,
        depositPercent: e.depositPercent ?? 0,
        sentAt: e.sentAt,
        viewCount: e.viewCount ?? 0,

        subtotal,
        total,
        status: e.status ?? 'Draft',
        files: e.files ?? [],
        notesInternal: e.notesInternal ?? '',
        terms: e.terms ?? 'Payment due upon receipt. Thank you for your business.',
        approvedAt: e.approvedAt,
        approvedBy: e.approvedBy,
        createdAt: e.createdAt ?? nowISO(),
        updatedAt: nowISO(),
        publicToken: e.publicToken ?? randToken(16),
      };
      dispatch({ type: 'UPSERT_ESTIMATE', payload: estimate });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'estimate.created', entityId: estimate.id } });
      return estimate;
    },
    sendEstimate(id) {
      const est = state.estimates.find((e) => e.id === id);
      if (!est) return;
      const updated: Estimate = { ...est, status: 'Sent', sentAt: nowISO(), updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_ESTIMATE', payload: updated });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'estimate.sent', entityId: id } });
    },
    approveEstimate(id, name) {
      const est = state.estimates.find((e) => e.id === id);
      if (!est) return;
      const updated: Estimate = { ...est, status: 'Approved', approvedAt: nowISO(), approvedBy: name, updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_ESTIMATE', payload: updated });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'estimate.approved', entityId: id } });
    },
    convertEstimateToJob(estimateId, start, end, recurrence) {
      const est = state.estimates.find((e) => e.id === estimateId);
      if (!est) return [];
      const s = start ?? new Date(Date.now() + 24 * 3600 * 1000);
      s.setHours(9, 0, 0, 0);
      const eDate = end ?? new Date(s.getTime() + 60 * 60 * 1000);
      const base: Job = {
        id: uuid(),
        businessId: state.business.id,
        estimateId: est.id,
        customerId: est.customerId,
        address: est.address,
        startsAt: s.toISOString(),
        endsAt: eDate.toISOString(),
        status: 'Scheduled',
        recurrence,
        total: est.total,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      const jobs: Job[] = [base];
      if (recurrence === 'biweekly') {
        for (let i = 1; i <= 6; i++) {
          const ss = new Date(s);
          ss.setDate(ss.getDate() + i * 14);
          const ee = new Date(eDate);
          ee.setDate(ee.getDate() + i * 14);
          jobs.push({ ...base, id: uuid(), startsAt: ss.toISOString(), endsAt: ee.toISOString(), createdAt: nowISO(), updatedAt: nowISO() });
        }
      }
      jobs.forEach((j) => dispatch({ type: 'UPSERT_JOB', payload: j }));
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'job.created', entityId: base.id } });
      return jobs;
    },
    upsertJob(j) {
      const job: Job = {
        id: j.id ?? uuid(),
        businessId: state.business.id,
        estimateId: j.estimateId,
        customerId: j.customerId,
        address: j.address,
        startsAt: j.startsAt,
        endsAt: j.endsAt,
        status: (j.status as Job['status']) ?? 'Scheduled',
        recurrence: j.recurrence,
        notes: j.notes,
        total: j.total,
        createdAt: j.createdAt ?? nowISO(),
        updatedAt: nowISO(),
      };
      dispatch({ type: 'UPSERT_JOB', payload: job });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'job.updated', entityId: job.id } });
      return job;
    },
    updateJobStatus(id, status) {
      const job = state.jobs.find((j) => j.id === id);
      if (!job) return;
      const updated: Job = { ...job, status, updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_JOB', payload: updated });
      if (status === 'Completed') {
        dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'job.completed', entityId: id } });
      }
    },
    deleteJob(id) { dispatch({ type: 'DELETE_JOB', id }); },
    createInvoiceFromJob(jobId, dueAt) {
      const job = state.jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');
      const est = job.estimateId ? state.estimates.find((e) => e.id === job.estimateId) : undefined;
      const lineItems: LineItem[] = est?.lineItems ?? [];
      const { subtotal, total } = computeTotals(lineItems, state.business.taxRateDefault, 0);
      const invoice: Invoice = {
        id: uuid(),
        number: api.nextInvoiceNumber(),
        businessId: state.business.id,
        customerId: job.customerId,
        jobId: job.id,
        lineItems: lineItems.map((li) => ({ ...li })),
        taxRate: state.business.taxRateDefault,
        discount: 0,
        subtotal,
        total,
        status: 'Draft',
        dueAt: (dueAt ?? new Date(Date.now() + 7 * 24 * 3600 * 1000)).toISOString(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        publicToken: randToken(16),
      };
      dispatch({ type: 'UPSERT_INVOICE', payload: invoice });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'invoice.created', entityId: invoice.id } });
      return invoice;
    },
    sendInvoice(id) {
      const inv = state.invoices.find((i) => i.id === id);
      if (!inv) return;
      const updated: Invoice = { ...inv, status: 'Sent', updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_INVOICE', payload: updated });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'invoice.sent', entityId: id } });
    },
    markInvoicePaid(id, last4) {
      const inv = state.invoices.find((i) => i.id === id);
      if (!inv) return;
      const updated: Invoice = { ...inv, status: 'Paid', paidAt: nowISO(), updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_INVOICE', payload: updated });
      // payment record is minimal for v1
      const payment = { id: uuid(), businessId: state.business.id, invoiceId: id, amount: inv.total, status: 'Succeeded' as const, receivedAt: nowISO(), method: 'Card' as const, last4 };
      // store payments in state
      const newState = { ...state, invoices: state.invoices.map((i) => (i.id === id ? updated : i)), payments: [payment, ...state.payments] } as AppState;
      saveState(newState);
      dispatch({ type: 'SET_STATE', payload: newState });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'invoice.paid', entityId: id } });
    },
    setBusiness(b) {
      const business: Business = { ...state.business, ...b } as Business;
      dispatch({ type: 'SET_BUSINESS', payload: business });
    },
    seedDemo() {
      // simple seed if empty
      if (state.customers.length > 0) return;
      const names = ['Joyce Andersen', 'Dug Seaman', 'Pat Muller', 'Sam Green', 'Alex Rivera'];
      const customers: Customer[] = names.map((n, idx) => ({ id: uuid(), businessId: state.business.id, name: n, email: `user${idx+1}@mail.com`, phone: '555-010' + idx, address: `${100+idx} Maple St` }));
      customers.forEach((c) => dispatch({ type: 'UPSERT_CUSTOMER', payload: c }));

      // estimates
      const makeLI = (name: string, qty: number, price: number): LineItem => ({ id: uuid(), name, qty, unit: 'hr', unitPrice: price, lineTotal: Math.round(qty * price) });
      const ests: Estimate[] = customers.slice(0,5).map((c, i) => {
        const lineItems = [makeLI('Lawn mowing', 2 + (i%2), 4500), makeLI('Hedge trim', 1, 3000)];
        const { subtotal, total } = computeTotals(lineItems, state.business.taxRateDefault, i===4?1000:0);
        const statuses: ('Sent'|'Approved'|'Declined'|'Draft')[] = ['Sent','Approved','Declined','Sent','Draft'];
        return {
          id: uuid(), number: `${state.business.numbering.estPrefix}${String(state.business.numbering.estSeq + i).padStart(3,'0')}`, businessId: state.business.id,
          customerId: c.id, address: c.address, lineItems, taxRate: state.business.taxRateDefault, discount: i===4?1000:0, subtotal, total,
          status: statuses[i], files: [], createdAt: nowISO(), updatedAt: nowISO(), publicToken: randToken(16), terms: 'Payment due upon receipt.'
        };
      });
      // bump seq
      dispatch({ type: 'SET_BUSINESS', payload: { ...state.business, numbering: { ...state.business.numbering, estSeq: state.business.numbering.estSeq + ests.length } } });
      ests.forEach((e) => dispatch({ type: 'UPSERT_ESTIMATE', payload: e }));

      // jobs
      const approved = ests.find((e) => e.status === 'Approved') ?? ests[1];
      const baseStart = new Date(); baseStart.setHours(10,0,0,0);
      const j1: Job = { id: uuid(), businessId: state.business.id, estimateId: approved.id, customerId: approved.customerId, address: approved.address, startsAt: new Date(baseStart).toISOString(), endsAt: new Date(baseStart.getTime()+60*60*1000).toISOString(), status: 'Scheduled', createdAt: nowISO(), updatedAt: nowISO(), total: approved.total };
      const j2: Job = { ...j1, id: uuid(), startsAt: new Date(baseStart.getTime()+2*60*60*1000).toISOString(), endsAt: new Date(baseStart.getTime()+3*60*60*1000).toISOString(), status: 'In Progress' };
      const j3: Job = { ...j1, id: uuid(), startsAt: new Date(baseStart.getTime()+24*60*60*1000).toISOString(), endsAt: new Date(baseStart.getTime()+25*60*60*1000).toISOString(), status: 'Completed' };
      const j4s = api.convertEstimateToJob(approved.id, new Date(baseStart.getTime()+3*24*60*60*1000), new Date(baseStart.getTime()+3*24*60*60*1000+60*60*1000), 'biweekly');
      [j1, j2, j3].forEach((j) => dispatch({ type: 'UPSERT_JOB', payload: j }));

      // invoices
      const inv1 = api.createInvoiceFromJob(j3.id, new Date(Date.now()+3*24*3600*1000));
      const inv2 = api.createInvoiceFromJob(j1.id, new Date(Date.now()+7*24*3600*1000));
      const inv3 = api.createInvoiceFromJob(j2.id, new Date(Date.now()-3*24*3600*1000));
      dispatch({ type: 'UPSERT_INVOICE', payload: { ...inv1, status: 'Paid', paidAt: nowISO() } });
      dispatch({ type: 'UPSERT_INVOICE', payload: { ...inv2, status: 'Sent' } });
      dispatch({ type: 'UPSERT_INVOICE', payload: { ...inv3, status: 'Overdue' } });
    },
    overwriteState(s) { dispatch({ type: 'SET_STATE', payload: s }); },
  }), [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('Store not available');
  return ctx;
}
