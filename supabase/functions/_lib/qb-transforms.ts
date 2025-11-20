/**
 * QuickBooks Data Transformation Layer
 * Converts between ServiceGrid and QuickBooks formats
 */

import type { QBCustomer, QBInvoice, QBPayment } from '../../../src/types/quickbooks.ts';

// ============================================================================
// ServiceGrid → QuickBooks Transformations
// ============================================================================

export function sgCustomerToQB(customer: any, businessSettings?: any): QBCustomer {
  const address = customer.address || '';
  const addressParts = parseAddress(address);
  
  return {
    Id: '', // Will be set by QB on creation
    DisplayName: customer.name,
    PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
    PrimaryPhone: customer.phone ? { FreeFormNumber: formatPhoneForQB(customer.phone) } : undefined,
    BillAddr: addressParts ? {
      Line1: addressParts.street,
      City: addressParts.city,
      CountrySubDivisionCode: addressParts.state,
      PostalCode: addressParts.zip,
    } : undefined,
    SyncToken: '0',
  };
}

export function sgInvoiceToQB(
  invoice: any,
  lineItems: any[],
  customer: any,
  qbCustomerId?: string
): QBInvoice {
  return {
    Id: '',
    DocNumber: invoice.number,
    CustomerRef: {
      value: qbCustomerId || '',
      name: customer.name,
    },
    TxnDate: formatDateForQB(invoice.created_at),
    DueDate: invoice.due_at ? formatDateForQB(invoice.due_at) : undefined,
    Line: lineItems.map((item, index) => ({
      DetailType: 'SalesItemLineDetail' as const,
      Description: item.name,
      Amount: centsToQBAmount(item.line_total),
      SalesItemLineDetail: {
        Qty: item.qty,
        UnitPrice: centsToQBAmount(item.unit_price),
      },
    })),
    TotalAmt: centsToQBAmount(invoice.total),
    Balance: invoice.status === 'Paid' ? 0 : centsToQBAmount(invoice.total),
    SyncToken: '0',
  };
}

export function sgPaymentToQB(payment: any, invoice: any, qbInvoiceId?: string): QBPayment {
  return {
    Id: '',
    TotalAmt: centsToQBAmount(payment.amount),
    CustomerRef: {
      value: '', // Will be looked up from invoice
    },
    TxnDate: formatDateForQB(payment.received_at),
    Line: [
      {
        Amount: centsToQBAmount(payment.amount),
        LinkedTxn: [
          {
            TxnId: qbInvoiceId || '',
            TxnType: 'Invoice',
          },
        ],
      },
    ],
  };
}

export function sgTimesheetToQB(timesheet: any, job: any): any {
  const hours = timesheet.duration_minutes / 60;
  
  return {
    NameOf: 'Employee',
    EmployeeRef: {
      value: '', // Would need QB employee ID
    },
    TxnDate: formatDateForQB(timesheet.clock_in_time),
    Hours: hours,
    Minutes: timesheet.duration_minutes % 60,
    Description: job.title || 'Service work',
    CustomerRef: {
      value: '', // Would need QB customer ID
    },
  };
}

// ============================================================================
// QuickBooks → ServiceGrid Transformations
// ============================================================================

export function qbCustomerToSG(qbCustomer: QBCustomer, businessId: string): any {
  const address = qbCustomer.BillAddr 
    ? `${qbCustomer.BillAddr.Line1 || ''}, ${qbCustomer.BillAddr.City || ''}, ${qbCustomer.BillAddr.CountrySubDivisionCode || ''} ${qbCustomer.BillAddr.PostalCode || ''}`.trim()
    : '';

  return {
    business_id: businessId,
    name: qbCustomer.DisplayName,
    email: qbCustomer.PrimaryEmailAddr?.Address || '',
    phone: qbCustomer.PrimaryPhone?.FreeFormNumber || '',
    address: address,
    notes: `Imported from QuickBooks (ID: ${qbCustomer.Id})`,
  };
}

export function qbInvoiceToSG(qbInvoice: QBInvoice, businessId: string, sgCustomerId: string): any {
  return {
    business_id: businessId,
    customer_id: sgCustomerId,
    number: qbInvoice.DocNumber,
    status: qbInvoice.Balance === 0 ? 'Paid' : 'Sent',
    subtotal: Math.round(qbInvoice.TotalAmt * 100), // QB uses dollars, SG uses cents
    total: Math.round(qbInvoice.TotalAmt * 100),
    created_at: parseDateFromQB(qbInvoice.TxnDate),
    due_at: qbInvoice.DueDate ? parseDateFromQB(qbInvoice.DueDate) : null,
    paid_at: qbInvoice.Balance === 0 ? new Date().toISOString() : null,
  };
}

export function qbPaymentToSG(qbPayment: QBPayment, invoiceId: string): any {
  return {
    invoice_id: invoiceId,
    amount: Math.round(qbPayment.TotalAmt * 100),
    received_at: parseDateFromQB(qbPayment.TxnDate),
    method: 'Other',
    status: 'completed',
  };
}

// ============================================================================
// Field Mapping Application
// ============================================================================

export function applyFieldMappings(
  data: any,
  mappings: any[],
  direction: 'to_qb' | 'from_qb'
): any {
  const result = { ...data };
  
  for (const mapping of mappings) {
    const sourceField = direction === 'to_qb' ? mapping.sg_field : mapping.qb_field;
    const targetField = direction === 'to_qb' ? mapping.qb_field : mapping.sg_field;
    
    if (data[sourceField] !== undefined) {
      result[targetField] = data[sourceField];
      
      // Apply transform function if specified
      if (mapping.transform_function) {
        try {
          const transform = new Function('value', `return ${mapping.transform_function}`);
          result[targetField] = transform(result[targetField]);
        } catch (error) {
          console.error(`Failed to apply transform: ${error.message}`);
        }
      }
    }
  }
  
  return result;
}

// ============================================================================
// Validation
// ============================================================================

export function validateQBData(entity: any, entityType: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  switch (entityType) {
    case 'customer':
      if (!entity.DisplayName) errors.push('DisplayName is required');
      if (entity.PrimaryEmailAddr && !isValidEmail(entity.PrimaryEmailAddr.Address)) {
        errors.push('Invalid email address');
      }
      break;
      
    case 'invoice':
      if (!entity.CustomerRef?.value) errors.push('Customer reference is required');
      if (!entity.Line || entity.Line.length === 0) errors.push('At least one line item is required');
      if (entity.TotalAmt <= 0) errors.push('Total amount must be greater than 0');
      break;
      
    case 'payment':
      if (!entity.CustomerRef?.value) errors.push('Customer reference is required');
      if (!entity.TotalAmt || entity.TotalAmt <= 0) errors.push('Payment amount must be greater than 0');
      if (!entity.Line || entity.Line.length === 0) errors.push('Payment must be linked to an invoice');
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseAddress(address: string): { street: string; city: string; state: string; zip: string } | null {
  if (!address) return null;
  
  // Simple address parsing - can be enhanced
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length < 2) return null;
  
  const lastPart = parts[parts.length - 1];
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5})/);
  
  return {
    street: parts[0] || '',
    city: parts[1] || '',
    state: stateZipMatch?.[1] || '',
    zip: stateZipMatch?.[2] || '',
  };
}

function formatPhoneForQB(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return phone;
}

function formatDateForQB(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function parseDateFromQB(qbDate: string): string {
  return new Date(qbDate).toISOString();
}

function centsToQBAmount(cents: number): number {
  return cents / 100;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function detectConflicts(sgData: any, qbData: any, entityType: string): string[] {
  const conflicts: string[] = [];
  
  // Compare key fields based on entity type
  const compareFields = getCompareFields(entityType);
  
  for (const field of compareFields) {
    if (sgData[field.sg] !== qbData[field.qb]) {
      conflicts.push(field.name);
    }
  }
  
  return conflicts;
}

function getCompareFields(entityType: string): Array<{ name: string; sg: string; qb: string }> {
  switch (entityType) {
    case 'customer':
      return [
        { name: 'Name', sg: 'name', qb: 'DisplayName' },
        { name: 'Email', sg: 'email', qb: 'PrimaryEmailAddr.Address' },
        { name: 'Phone', sg: 'phone', qb: 'PrimaryPhone.FreeFormNumber' },
      ];
    case 'invoice':
      return [
        { name: 'Number', sg: 'number', qb: 'DocNumber' },
        { name: 'Total', sg: 'total', qb: 'TotalAmt' },
        { name: 'Status', sg: 'status', qb: 'Balance' },
      ];
    default:
      return [];
  }
}
