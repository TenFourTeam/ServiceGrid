
import { z } from 'zod'

export const ID = z.string()
export const Money = z.number()
export const ISODate = z.string()

const NumberingSchema = z.object({
  estPrefix: z.string(),
  estSeq: z.number(),
  invPrefix: z.string(),
  invSeq: z.number(),
})

// New enums for quoted journey
export const QuoteFrequencySchema = z.enum(['one-off', 'bi-monthly', 'monthly', 'bi-yearly', 'yearly'])
export const PaymentTermsSchema = z.enum(['due_on_receipt', 'net_15', 'net_30', 'net_60'])

export const BusinessSchema = z.object({
  id: ID,
  name: z.string(),
  logoUrl: z.string().url().optional(),
  lightLogoUrl: z.string().url().optional(), // NEW
  phone: z.string().optional(),
  replyToEmail: z.string().email().optional(),
  taxRateDefault: z.number(),
  numbering: NumberingSchema,
})

export const CustomerSchema = z.object({
  id: ID,
  businessId: ID,
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const LineItemSchema = z.object({
  id: ID,
  name: z.string(),
  qty: z.number(),
  unit: z.string().optional(),
  unitPrice: Money,
  lineTotal: Money,
})

export const QuoteStatusSchema = z.enum(['Draft', 'Sent', 'Approved', 'Declined'])
export const quoteStatusSchema = QuoteStatusSchema

export const QuoteSchema = z.object({
  id: ID,
  number: z.string(),
  businessId: ID,
  customerId: ID,
  address: z.string().optional(),
  lineItems: z.array(LineItemSchema),
  taxRate: z.number(),
  discount: Money,

  // New fields
  paymentTerms: PaymentTermsSchema.optional(),
  frequency: QuoteFrequencySchema.optional(),
  depositRequired: z.boolean().optional(),
  depositPercent: z.number().optional(),
  sentAt: ISODate.optional(),
  viewCount: z.number().optional(),

  subtotal: Money,
  total: Money,
  status: QuoteStatusSchema,
  files: z.array(z.string()).optional(),
  notesInternal: z.string().optional(),
  terms: z.string().optional(),
  approvedAt: ISODate.optional(),
  approvedBy: z.string().optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
  publicToken: z.string(),
})

export const quoteSchema = QuoteSchema

export const JobStatusSchema = z.enum(['Scheduled', 'In Progress', 'Completed'])

export const JobSchema = z.object({
  id: ID,
  businessId: ID,
  quoteId: ID.optional(),
  customerId: ID,
  address: z.string().optional(),
  startsAt: ISODate,
  endsAt: ISODate,
  status: JobStatusSchema,
  recurrence: z.enum(['biweekly']).optional(),
  notes: z.string().optional(),
  total: Money.optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
})

export const InvoiceStatusSchema = z.enum(['Draft', 'Sent', 'Paid', 'Overdue'])

export const InvoiceSchema = z.object({
  id: ID,
  number: z.string(),
  businessId: ID,
  customerId: ID,
  jobId: ID.optional(),
  lineItems: z.array(LineItemSchema),
  taxRate: z.number(),
  discount: Money,
  subtotal: Money,
  total: Money,
  status: InvoiceStatusSchema,
  dueAt: ISODate.optional(),
  paidAt: ISODate.optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
  publicToken: z.string(),
})

export const PaymentSchema = z.object({
  id: ID,
  businessId: ID,
  invoiceId: ID,
  amount: Money,
  status: z.enum(['Succeeded', 'Failed']),
  receivedAt: ISODate,
  method: z.enum(['Card']),
  last4: z.string().optional(),
})

export const AppEventSchema = z.object({
  id: ID,
  ts: ISODate,
  type: z.enum([
    'quote.created', 'quote.sent', 'quote.approved',
    'job.created', 'job.updated', 'job.completed',
    'invoice.created', 'invoice.sent', 'invoice.paid',
  ]),
  entityId: ID,
  meta: z.record(z.any()).optional(),
})

export const AppStateSchema = z.object({
  business: BusinessSchema,
  customers: z.array(CustomerSchema),
  quotes: z.array(QuoteSchema),
  jobs: z.array(JobSchema),
  invoices: z.array(InvoiceSchema),
  payments: z.array(PaymentSchema),
  events: z.array(AppEventSchema),
})

