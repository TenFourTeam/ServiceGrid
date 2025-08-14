// DEPRECATED: This store has been replaced by React Query for server state
// Only keeping the export to prevent runtime errors during transition

import { AppEvent, AppState, Business, Customer, Quote, Invoice, Job, LineItem, Money } from '@/types';
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
  name: 'ServiceGrid',
  phone: '',
  replyToEmail: '',
  taxRateDefault: 0.08,
  numbering: { estPrefix: 'QUO-', estSeq: 1, invPrefix: 'INV-', invSeq: 1 },
});

const initialState: AppState = loadState<AppState>() ?? {
  business: defaultBusiness(),
  customers: [],
  quotes: [],
  jobs: [],
  invoices: [],
  payments: [],
  events: [],
  // NEW: UI state for persistent preferences
  ui: {
    setupWidgetDismissed: false,
    setupWidgetDismissedAt: null,
  },
};

// Actions
type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'UPSERT_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; id: string }
  | { type: 'UPSERT_QUOTE'; payload: Quote }
  | { type: 'DELETE_QUOTE'; id: string }
  | { type: 'UPSERT_JOB'; payload: Job }
  | { type: 'DELETE_JOB'; id: string }
  | { type: 'UPSERT_INVOICE'; payload: Invoice }
  | { type: 'ADD_EVENT'; payload: AppEvent }
  | { type: 'SET_BUSINESS'; payload: Business }
  | { type: 'DISMISS_SETUP_WIDGET'; permanently?: boolean }
  | { type: 'RESET_DISMISSALS' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'SET_BUSINESS':
      return { ...state, business: action.payload };
    case 'DISMISS_SETUP_WIDGET':
      return {
        ...state,
        ui: {
          ...state.ui,
          setupWidgetDismissed: true,
          setupWidgetDismissedAt: action.permanently ? nowISO() : null,
        },
      };
    case 'RESET_DISMISSALS':
      return {
        ...state,
        ui: {
          ...state.ui,
          setupWidgetDismissed: false,
          setupWidgetDismissedAt: null,
        },
      };
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
    case 'UPSERT_QUOTE': {
      const exists = state.quotes.some((e) => e.id === action.payload.id);
      const quotes = exists
        ? state.quotes.map((e) => (e.id === action.payload.id ? action.payload : e))
        : [action.payload, ...state.quotes];
      return { ...state, quotes };
    }
    case 'DELETE_QUOTE': {
      return { ...state, quotes: state.quotes.filter((q) => q.id !== action.id) };
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
  nextQuoteNumber(): string;
  nextEstimateNumber(): string;
  nextInvoiceNumber(): string;
  upsertCustomer(c: Partial<Customer> & { name: string }): Customer;
  deleteCustomer(id: string): void;
  upsertQuote(e: Partial<Quote> & { customerId: string }): Quote;
  deleteQuote(id: string): void;
  upsertEstimate(e: Partial<Quote> & { customerId: string }): Quote;
  sendQuote(id: string): void;
  sendEstimate(id: string): void;
  approveQuote(id: string, name: string): void;
  approveEstimate(id: string, name: string): void;
  convertQuoteToJob(quoteId: string, start?: Date, end?: Date, recurrence?: 'biweekly'): Job[];
  convertEstimateToJob(estimateId: string, start?: Date, end?: Date, recurrence?: 'biweekly'): Job[];
  upsertJob(j: Partial<Job> & { customerId: string; startsAt: string; endsAt: string }): Job;
  updateJobStatus(id: string, status: Job['status']): void;
  deleteJob(id: string): void;
  upsertInvoice(i: Invoice): void;
  createInvoiceFromJob(jobId: string, dueAt?: Date): Invoice;
  sendInvoice(id: string): void;
  markInvoicePaid(id: string, last4?: string): void;
  setBusiness(b: Partial<Business>): void;
  
  overwriteState(state: AppState): void;

  // NEW: quote engagement helpers
  recordQuoteOpen(id: string): void;
  requestQuoteEdit(id: string): void;
  
  // NEW: UI state management
  dismissSetupWidget(permanently?: boolean): void;
  shouldShowSetupWidget(): boolean;
  resetDismissals(): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => saveState(state), [state]);

  const api: Store = useMemo(() => ({
    ...state,
    nextQuoteNumber() {
      const n = state.business.numbering.estSeq;
      const num = `${state.business.numbering.estPrefix}${String(n).padStart(3, '0')}`;
      const business = { ...state.business, numbering: { ...state.business.numbering, estSeq: n + 1 } };
      dispatch({ type: 'SET_BUSINESS', payload: business });
      return num;
    },
    nextEstimateNumber() { return (this as any).nextQuoteNumber(); },
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
    deleteCustomer(id) {
      dispatch({ type: 'DELETE_CUSTOMER', id });
    },
    upsertQuote(e) {
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
      const quote: Quote = {
        id: e.id ?? uuid(),
        number: e.number ?? api.nextQuoteNumber(),
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
      dispatch({ type: 'UPSERT_QUOTE', payload: quote });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'quote.created', entityId: quote.id } });
      return quote;
    },
    deleteQuote(id) {
      dispatch({ type: 'DELETE_QUOTE', id });
    },
    upsertEstimate(e) { return (api as any).upsertQuote(e); },
    sendQuote(id) {
      const est = state.quotes.find((e) => e.id === id);
      if (!est) return;
      const updated: Quote = { ...est, status: 'Sent', sentAt: nowISO(), updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_QUOTE', payload: updated });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'quote.sent', entityId: id } });
    },
    sendEstimate(id) { return (api as any).sendQuote(id); },
    approveQuote(id, name) {
      const est = state.quotes.find((e) => e.id === id);
      if (!est) return;
      const updated: Quote = { ...est, status: 'Approved', approvedAt: nowISO(), approvedBy: name, updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_QUOTE', payload: updated });
      dispatch({ type: 'ADD_EVENT', payload: { id: uuid(), ts: nowISO(), type: 'quote.approved', entityId: id } });
    },
    approveEstimate(id, name) { return (api as any).approveQuote(id, name); },
    convertQuoteToJob(quoteId, start, end, recurrence) {
      const est = state.quotes.find((e) => e.id === quoteId);
      if (!est) return [];
      const s = start ?? new Date(Date.now() + 24 * 3600 * 1000);
      s.setHours(9, 0, 0, 0);
      const eDate = end ?? new Date(s.getTime() + 60 * 60 * 1000);
      const base: Job = {
        id: uuid(),
        businessId: state.business.id,
        quoteId: est.id,
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
    convertEstimateToJob(estimateId, start, end, recurrence) { return (api as any).convertQuoteToJob(estimateId, start, end, recurrence); },
    upsertJob(j) {
      const job: Job = {
        id: j.id ?? uuid(),
        businessId: state.business.id,
        quoteId: (j as any).quoteId ?? (j as any).estimateId, // backward compat
        customerId: j.customerId,
        address: j.address,
        title: (j as any).title,
        startsAt: j.startsAt,
        endsAt: j.endsAt,
        status: (j.status as Job['status']) ?? 'Scheduled',
        recurrence: j.recurrence,
        notes: j.notes,
        total: j.total,
        photos: (j as any).photos ?? [],
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
    upsertInvoice(i) { dispatch({ type: 'UPSERT_INVOICE', payload: i }); },
    createInvoiceFromJob(jobId, dueAt) {
      const job = state.jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');
      const est = (job as any).quoteId ? state.quotes.find((e) => e.id === (job as any).quoteId) : undefined;
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
    overwriteState(s) { dispatch({ type: 'SET_STATE', payload: s }); },

    // NEW: record a quote "open" (email viewed)
    recordQuoteOpen(id) {
      const est = state.quotes.find((e) => e.id === id);
      if (!est) return;
      const nextViewCount = (est.viewCount ?? 0) + 1;
      const nextStatus: Quote['status'] =
        est.status === 'Approved' || est.status === 'Declined'
          ? est.status
          : (est.status === 'Sent' || est.status === 'Viewed')
            ? 'Viewed'
            : est.status;
      const updated: Quote = { ...est, status: nextStatus, viewCount: nextViewCount, updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_QUOTE', payload: updated });
    },

    // NEW: customer requested edits -> move back to Draft (edits requested)
    requestQuoteEdit(id) {
      const est = state.quotes.find((e) => e.id === id);
      if (!est) return;
      const updated: Quote = { ...est, status: 'Edits Requested', updatedAt: nowISO() };
      dispatch({ type: 'UPSERT_QUOTE', payload: updated });
    },

    // NEW: UI state management
    dismissSetupWidget(permanently = false) {
      dispatch({ type: 'DISMISS_SETUP_WIDGET', permanently });
    },

    shouldShowSetupWidget() {
      // Don't show if permanently dismissed
      if (state.ui?.setupWidgetDismissedAt) return false;
      
      // Allow temporary dismissal but reset on new session
      return !state.ui?.setupWidgetDismissed;
    },

    resetDismissals() {
      dispatch({ type: 'RESET_DISMISSALS' });
    },
  }), [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    console.warn('DEPRECATED: useStore() called but store provider was removed. Use React Query hooks instead.');
    // Return a minimal fallback to prevent crashes during transition
    return {
      business: { id: '', name: 'Loading...', nameCustomized: false },
      customers: [],
      jobs: [],
      quotes: [],
      invoices: [],
      upsertJob: () => console.warn('upsertJob called on deprecated store'),
      deleteJob: () => console.warn('deleteJob called on deprecated store'),
      updateJobStatus: () => console.warn('updateJobStatus called on deprecated store'),
    } as any;
  }
  return ctx;
}