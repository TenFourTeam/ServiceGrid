-- Phase 1: Add missing fields to invoices table to match quotes functionality

-- Add address field
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS address text;

-- Add payment terms field (reuse existing enum from quotes)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms payment_terms;

-- Add frequency field using correct enum name
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS frequency quote_frequency;

-- Add deposit fields
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deposit_percent smallint;

-- Add internal notes field
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes_internal text;

-- Add terms field
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms text;

-- Add comment for tracking this enhancement
COMMENT ON TABLE public.invoices IS 'Enhanced to match quote functionality with address, payment terms, deposit info, notes, and terms fields';