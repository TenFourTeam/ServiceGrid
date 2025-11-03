export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_activity_log: {
        Row: {
          accepted: boolean | null
          activity_type: string
          business_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          activity_type: string
          business_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          activity_type?: string
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_activity_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          business_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      business_constraints: {
        Row: {
          business_id: string
          constraint_type: Database["public"]["Enums"]["constraint_type"]
          constraint_value: Json
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          constraint_type: Database["public"]["Enums"]["constraint_type"]
          constraint_value: Json
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          constraint_type?: Database["public"]["Enums"]["constraint_type"]
          constraint_value?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_constraints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_permissions: {
        Row: {
          business_id: string
          created_at: string
          granted_at: string
          granted_by: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          granted_at?: string
          granted_by: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          application_fee_bps: number
          clerk_org_id: string | null
          created_at: string
          description: string | null
          est_prefix: string
          est_seq: number
          id: string
          inv_prefix: string
          inv_seq: number
          light_logo_url: string | null
          logo_url: string | null
          name: string
          name_customized: boolean
          owner_id: string
          phone: string | null
          reply_to_email: string | null
          slug: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          tax_rate_default: number
          updated_at: string
        }
        Insert: {
          application_fee_bps?: number
          clerk_org_id?: string | null
          created_at?: string
          description?: string | null
          est_prefix?: string
          est_seq?: number
          id?: string
          inv_prefix?: string
          inv_seq?: number
          light_logo_url?: string | null
          logo_url?: string | null
          name?: string
          name_customized?: boolean
          owner_id: string
          phone?: string | null
          reply_to_email?: string | null
          slug?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          tax_rate_default?: number
          updated_at?: string
        }
        Update: {
          application_fee_bps?: number
          clerk_org_id?: string | null
          created_at?: string
          description?: string | null
          est_prefix?: string
          est_seq?: number
          id?: string
          inv_prefix?: string
          inv_seq?: number
          light_logo_url?: string | null
          logo_url?: string | null
          name?: string
          name_customized?: boolean
          owner_id?: string
          phone?: string | null
          reply_to_email?: string | null
          slug?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          tax_rate_default?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          avoid_days: Json | null
          business_id: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          preferred_days: Json | null
          preferred_time_window: Json | null
          scheduling_notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avoid_days?: Json | null
          business_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          preferred_days?: Json | null
          preferred_time_window?: Json | null
          scheduling_notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avoid_days?: Json | null
          business_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          preferred_days?: Json | null
          preferred_time_window?: Json | null
          scheduling_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          current_quantity: number
          description: string | null
          id: string
          is_active: boolean
          last_restocked_at: string | null
          location: string | null
          max_quantity: number | null
          min_quantity: number | null
          name: string
          notes: string | null
          owner_id: string
          sku: string | null
          supplier: string | null
          unit_cost: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          current_quantity?: number
          description?: string | null
          id?: string
          is_active?: boolean
          last_restocked_at?: string | null
          location?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          name: string
          notes?: string | null
          owner_id: string
          sku?: string | null
          supplier?: string | null
          unit_cost?: number | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          current_quantity?: number
          description?: string | null
          id?: string
          is_active?: boolean
          last_restocked_at?: string | null
          location?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          sku?: string | null
          supplier?: string | null
          unit_cost?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          business_id: string
          created_at: string
          id: string
          inventory_item_id: string
          job_id: string | null
          notes: string | null
          quantity: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          inventory_item_id: string
          job_id?: string | null
          notes?: string | null
          quantity: number
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          job_id?: string | null
          notes?: string | null
          quantity?: number
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_user_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["business_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["business_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["business_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          line_total: number
          name: string
          owner_id: string
          position: number
          qty: number
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          line_total: number
          name: string
          owner_id: string
          position?: number
          qty?: number
          unit?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          line_total?: number
          name?: string
          owner_id?: string
          position?: number
          qty?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          customer_id: string
          deposit_percent: number | null
          deposit_required: boolean
          discount: number
          due_at: string | null
          frequency: Database["public"]["Enums"]["quote_frequency"] | null
          id: string
          job_id: string | null
          notes_internal: string | null
          number: string
          owner_id: string
          paid_at: string | null
          payment_terms: Database["public"]["Enums"]["payment_terms"] | null
          public_token: string
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          customer_id: string
          deposit_percent?: number | null
          deposit_required?: boolean
          discount?: number
          due_at?: string | null
          frequency?: Database["public"]["Enums"]["quote_frequency"] | null
          id?: string
          job_id?: string | null
          notes_internal?: string | null
          number: string
          owner_id: string
          paid_at?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          public_token?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string
          deposit_percent?: number | null
          deposit_required?: boolean
          discount?: number
          due_at?: string | null
          frequency?: Database["public"]["Enums"]["quote_frequency"] | null
          id?: string
          job_id?: string | null
          notes_internal?: string | null
          number?: string
          owner_id?: string
          paid_at?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          public_token?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          id: string
          job_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          id?: string
          job_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          id?: string
          job_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          ai_suggested: boolean | null
          ai_suggestion_accepted: boolean | null
          ai_suggestion_rejected_reason: string | null
          business_id: string
          clock_in_time: string | null
          clock_out_time: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          ends_at: string | null
          estimated_duration_minutes: number | null
          id: string
          is_assessment: boolean | null
          is_clocked_in: boolean | null
          is_recurring: boolean
          job_type: Database["public"]["Enums"]["job_type"] | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          optimized_order: number | null
          owner_id: string
          parent_quote_id: string | null
          photos: Json
          preferred_time_window: Json | null
          priority: number | null
          quote_id: string | null
          recurrence: string | null
          recurring_template_id: string | null
          request_id: string | null
          scheduling_score: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_suggested?: boolean | null
          ai_suggestion_accepted?: boolean | null
          ai_suggestion_rejected_reason?: string | null
          business_id: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          ends_at?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_assessment?: boolean | null
          is_clocked_in?: boolean | null
          is_recurring?: boolean
          job_type?: Database["public"]["Enums"]["job_type"] | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          optimized_order?: number | null
          owner_id: string
          parent_quote_id?: string | null
          photos?: Json
          preferred_time_window?: Json | null
          priority?: number | null
          quote_id?: string | null
          recurrence?: string | null
          recurring_template_id?: string | null
          request_id?: string | null
          scheduling_score?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_suggested?: boolean | null
          ai_suggestion_accepted?: boolean | null
          ai_suggestion_rejected_reason?: string | null
          business_id?: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          ends_at?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_assessment?: boolean | null
          is_clocked_in?: boolean | null
          is_recurring?: boolean
          job_type?: Database["public"]["Enums"]["job_type"] | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          optimized_order?: number | null
          owner_id?: string
          parent_quote_id?: string | null
          photos?: Json
          preferred_time_window?: Json | null
          priority?: number | null
          quote_id?: string | null
          recurrence?: string | null
          recurring_template_id?: string | null
          request_id?: string | null
          scheduling_score?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_job_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_emails_sent: {
        Row: {
          email_data: Json | null
          email_type: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_data?: Json | null
          email_type: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_data?: Json | null
          email_type?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_emails_sent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_sends: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          job_id: string | null
          provider_message_id: string | null
          quote_id: string | null
          request_hash: string
          status: string
          subject: string
          to_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          provider_message_id?: string | null
          quote_id?: string | null
          request_hash: string
          status?: string
          subject: string
          to_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          provider_message_id?: string | null
          quote_id?: string | null
          request_hash?: string
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          last4: string | null
          method: string
          owner_id: string
          received_at: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          last4?: string | null
          method?: string
          owner_id: string
          received_at: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          last4?: string | null
          method?: string
          owner_id?: string
          received_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clerk_user_id: string | null
          created_at: string
          default_business_id: string | null
          email: string
          full_name: string | null
          id: string
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string
          default_business_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string
          default_business_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone_e164?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_business_id_fkey"
            columns: ["default_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_events: {
        Row: {
          created_at: string
          id: string
          meta: Json | null
          quote_id: string
          token: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json | null
          quote_id: string
          token: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json | null
          quote_id?: string
          token?: string
          type?: string
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          name: string
          owner_id: string
          position: number
          qty: number
          quote_id: string
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          name: string
          owner_id: string
          position?: number
          qty?: number
          quote_id: string
          unit?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          name?: string
          owner_id?: string
          position?: number
          qty?: number
          quote_id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          customer_id: string
          customer_notes: string | null
          deposit_percent: number | null
          deposit_required: boolean
          discount: number
          files: Json
          frequency: Database["public"]["Enums"]["quote_frequency"] | null
          id: string
          is_active: boolean
          is_subscription: boolean
          notes_internal: string | null
          number: string
          owner_id: string
          payment_terms: Database["public"]["Enums"]["payment_terms"] | null
          public_token: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          stripe_subscription_id: string | null
          subtotal: number
          superseded_at: string | null
          superseded_by_quote_id: string | null
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          view_count: number
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          deposit_percent?: number | null
          deposit_required?: boolean
          discount?: number
          files?: Json
          frequency?: Database["public"]["Enums"]["quote_frequency"] | null
          id?: string
          is_active?: boolean
          is_subscription?: boolean
          notes_internal?: string | null
          number: string
          owner_id: string
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          stripe_subscription_id?: string | null
          subtotal?: number
          superseded_at?: string | null
          superseded_by_quote_id?: string | null
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          deposit_percent?: number | null
          deposit_required?: boolean
          discount?: number
          files?: Json
          frequency?: Database["public"]["Enums"]["quote_frequency"] | null
          id?: string
          is_active?: boolean
          is_subscription?: boolean
          notes_internal?: string | null
          number?: string
          owner_id?: string
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          stripe_subscription_id?: string | null
          subtotal?: number
          superseded_at?: string | null
          superseded_by_quote_id?: string | null
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_job_templates: {
        Row: {
          address: string | null
          assigned_members: Json | null
          auto_schedule: boolean
          business_id: string
          created_at: string
          customer_id: string
          end_date: string | null
          estimated_duration_minutes: number
          id: string
          is_active: boolean
          last_generated_at: string | null
          next_generation_date: string | null
          notes: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          preferred_time_window: Json | null
          recurrence_config: Json
          recurrence_pattern: Database["public"]["Enums"]["recurrence_pattern"]
          start_date: string
          territory_id: string | null
          territory_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_members?: Json | null
          auto_schedule?: boolean
          business_id: string
          created_at?: string
          customer_id: string
          end_date?: string | null
          estimated_duration_minutes?: number
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          next_generation_date?: string | null
          notes?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          preferred_time_window?: Json | null
          recurrence_config: Json
          recurrence_pattern: Database["public"]["Enums"]["recurrence_pattern"]
          start_date: string
          territory_id?: string | null
          territory_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_members?: Json | null
          auto_schedule?: boolean
          business_id?: string
          created_at?: string
          customer_id?: string
          end_date?: string | null
          estimated_duration_minutes?: number
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          next_generation_date?: string | null
          notes?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          preferred_time_window?: Json | null
          recurrence_config?: Json
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern"]
          start_date?: string
          territory_id?: string | null
          territory_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_job_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_job_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedules: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          frequency: Database["public"]["Enums"]["quote_frequency"]
          id: string
          is_active: boolean
          next_billing_date: string
          quote_id: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          frequency: Database["public"]["Enums"]["quote_frequency"]
          id?: string
          is_active?: boolean
          next_billing_date: string
          quote_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          frequency?: Database["public"]["Enums"]["quote_frequency"]
          id?: string
          is_active?: boolean
          next_billing_date?: string
          quote_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          click_count: number | null
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          alternative_date: string | null
          business_id: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          owner_id: string
          photos: Json
          preferred_assessment_date: string | null
          preferred_times: Json | null
          property_address: string | null
          service_details: string
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          alternative_date?: string | null
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          owner_id: string
          photos?: Json
          preferred_assessment_date?: string | null
          preferred_times?: Json | null
          property_address?: string | null
          service_details: string
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          alternative_date?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          photos?: Json
          preferred_assessment_date?: string | null
          preferred_times?: Json | null
          property_address?: string | null
          service_details?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_availability: {
        Row: {
          business_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          business_id: string
          created_at: string
          end_date: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["time_off_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["time_off_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["time_off_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          business_id: string
          clock_in_time: string
          clock_out_time: string | null
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          clock_in_time?: string
          clock_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          clock_in_time?: string
          clock_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_time_cache: {
        Row: {
          cached_at: string | null
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          distance_miles: number | null
          expires_at: string | null
          id: string
          origin_address: string
          origin_lat: number | null
          origin_lng: number | null
          travel_time_minutes: number
        }
        Insert: {
          cached_at?: string | null
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_miles?: number | null
          expires_at?: string | null
          id?: string
          origin_address: string
          origin_lat?: number | null
          origin_lng?: number | null
          travel_time_minutes: number
        }
        Update: {
          cached_at?: string | null
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_miles?: number | null
          expires_at?: string | null
          id?: string
          origin_address?: string
          origin_lat?: number | null
          origin_lng?: number | null
          travel_time_minutes?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_customer_contact_info: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      can_manage_business: { Args: { p_business_id: string }; Returns: boolean }
      current_clerk_user_id: { Args: never; Returns: string }
      current_user_profile_id: { Args: never; Returns: string }
      debug_auth_state: { Args: never; Returns: Json }
      ensure_default_business: {
        Args: never
        Returns: {
          application_fee_bps: number
          clerk_org_id: string | null
          created_at: string
          description: string | null
          est_prefix: string
          est_seq: number
          id: string
          inv_prefix: string
          inv_seq: number
          light_logo_url: string | null
          logo_url: string | null
          name: string
          name_customized: boolean
          owner_id: string
          phone: string | null
          reply_to_email: string | null
          slug: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          tax_rate_default: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_active_subscription_info: {
        Args: { p_business_id: string; p_customer_id: string }
        Returns: {
          frequency: Database["public"]["Enums"]["quote_frequency"]
          next_billing_date: string
          quote_id: string
          subscription_id: string
        }[]
      }
      has_active_subscription: {
        Args: { p_business_id: string; p_customer_id: string }
        Returns: boolean
      }
      has_business_permission: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: boolean
      }
      is_business_member: { Args: { p_business_id: string }; Returns: boolean }
      link_invoice_relations: {
        Args: {
          p_invoice_id: string
          p_job_id?: string
          p_quote_id?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      log_audit_action: {
        Args: {
          p_action: string
          p_business_id: string
          p_details?: Json
          p_ip_address?: string
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      next_est_number: { Args: { p_business_id: string }; Returns: string }
      next_inv_number:
        | {
            Args: { p_business_id: string; p_user_id: string }
            Returns: string
          }
        | { Args: { p_business_id: string }; Returns: string }
      supersede_previous_quotes: {
        Args: {
          p_business_id: string
          p_customer_id: string
          p_is_subscription?: boolean
          p_new_quote_id: string
        }
        Returns: undefined
      }
      user_business_role: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["business_role"]
      }
    }
    Enums: {
      business_role: "owner" | "worker"
      constraint_type:
        | "max_jobs_per_day"
        | "max_hours_per_day"
        | "min_time_between_jobs"
        | "max_travel_time"
        | "business_hours"
        | "buffer_time"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue"
      job_status:
        | "Scheduled"
        | "In Progress"
        | "Completed"
        | "Schedule Approved"
      job_type: "appointment" | "time_and_materials"
      payment_status: "Succeeded" | "Failed"
      payment_terms: "due_on_receipt" | "net_15" | "net_30" | "net_60"
      quote_frequency:
        | "one-off"
        | "bi-monthly"
        | "monthly"
        | "bi-yearly"
        | "yearly"
      quote_status:
        | "Draft"
        | "Sent"
        | "Viewed"
        | "Approved"
        | "Declined"
        | "Edits Requested"
      recurrence_pattern: "daily" | "weekly" | "biweekly" | "monthly" | "custom"
      request_status:
        | "New"
        | "Reviewed"
        | "Scheduled"
        | "Completed"
        | "Declined"
        | "Assessed"
        | "Archived"
      time_off_status: "pending" | "approved" | "denied"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_role: ["owner", "worker"],
      constraint_type: [
        "max_jobs_per_day",
        "max_hours_per_day",
        "min_time_between_jobs",
        "max_travel_time",
        "business_hours",
        "buffer_time",
      ],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue"],
      job_status: [
        "Scheduled",
        "In Progress",
        "Completed",
        "Schedule Approved",
      ],
      job_type: ["appointment", "time_and_materials"],
      payment_status: ["Succeeded", "Failed"],
      payment_terms: ["due_on_receipt", "net_15", "net_30", "net_60"],
      quote_frequency: [
        "one-off",
        "bi-monthly",
        "monthly",
        "bi-yearly",
        "yearly",
      ],
      quote_status: [
        "Draft",
        "Sent",
        "Viewed",
        "Approved",
        "Declined",
        "Edits Requested",
      ],
      recurrence_pattern: ["daily", "weekly", "biweekly", "monthly", "custom"],
      request_status: [
        "New",
        "Reviewed",
        "Scheduled",
        "Completed",
        "Declined",
        "Assessed",
        "Archived",
      ],
      time_off_status: ["pending", "approved", "denied"],
    },
  },
} as const
