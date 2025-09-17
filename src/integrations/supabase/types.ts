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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
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
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          joined_at: string | null
          joined_via_invite: boolean
          role: Database["public"]["Enums"]["business_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          joined_via_invite?: boolean
          role?: Database["public"]["Enums"]["business_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          joined_via_invite?: boolean
          role?: Database["public"]["Enums"]["business_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
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
          created_at: string
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
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          tax_rate_default: number
          updated_at: string
        }
        Insert: {
          application_fee_bps?: number
          created_at?: string
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
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          tax_rate_default?: number
          updated_at?: string
        }
        Update: {
          application_fee_bps?: number
          created_at?: string
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
          business_id: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
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
      invites: {
        Row: {
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          redeemed_at: string | null
          redeemed_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["business_role"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["business_role"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["business_role"]
          token_hash?: string
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
          business_id: string
          created_at: string
          customer_id: string
          discount: number
          due_at: string | null
          id: string
          job_id: string | null
          number: string
          owner_id: string
          paid_at: string | null
          public_token: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          discount?: number
          due_at?: string | null
          id?: string
          job_id?: string | null
          number: string
          owner_id: string
          paid_at?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          discount?: number
          due_at?: string | null
          id?: string
          job_id?: string | null
          number?: string
          owner_id?: string
          paid_at?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_rate?: number
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
          business_id: string
          clock_in_time: string | null
          clock_out_time: string | null
          created_at: string
          customer_id: string
          ends_at: string | null
          id: string
          is_assessment: boolean | null
          is_clocked_in: boolean | null
          job_type: Database["public"]["Enums"]["job_type"] | null
          notes: string | null
          owner_id: string
          photos: Json
          quote_id: string | null
          recurrence: string | null
          request_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string
          customer_id: string
          ends_at?: string | null
          id?: string
          is_assessment?: boolean | null
          is_clocked_in?: boolean | null
          job_type?: Database["public"]["Enums"]["job_type"] | null
          notes?: string | null
          owner_id: string
          photos?: Json
          quote_id?: string | null
          recurrence?: string | null
          request_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string
          customer_id?: string
          ends_at?: string | null
          id?: string
          is_assessment?: boolean | null
          is_clocked_in?: boolean | null
          job_type?: Database["public"]["Enums"]["job_type"] | null
          notes?: string | null
          owner_id?: string
          photos?: Json
          quote_id?: string | null
          recurrence?: string | null
          request_id?: string | null
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
            foreignKeyName: "jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
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
          deposit_percent: number | null
          deposit_required: boolean
          discount: number
          files: Json
          frequency: Database["public"]["Enums"]["quote_frequency"] | null
          id: string
          notes_internal: string | null
          number: string
          owner_id: string
          payment_terms: Database["public"]["Enums"]["payment_terms"] | null
          public_token: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
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
          deposit_percent?: number | null
          deposit_required?: boolean
          discount?: number
          files?: Json
          frequency?: Database["public"]["Enums"]["quote_frequency"] | null
          id?: string
          notes_internal?: string | null
          number: string
          owner_id: string
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
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
          deposit_percent?: number | null
          deposit_required?: boolean
          discount?: number
          files?: Json
          frequency?: Database["public"]["Enums"]["quote_frequency"] | null
          id?: string
          notes_internal?: string | null
          number?: string
          owner_id?: string
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
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
      requests: {
        Row: {
          alternative_date: string | null
          business_id: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          owner_id: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_business: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      current_clerk_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      ensure_default_business: {
        Args: Record<PropertyKey, never>
        Returns: {
          application_fee_bps: number
          created_at: string
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
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          tax_rate_default: number
          updated_at: string
        }
      }
      is_business_member: {
        Args: { p_business_id: string }
        Returns: boolean
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
      next_est_number: {
        Args: { p_business_id: string }
        Returns: string
      }
      next_inv_number: {
        Args:
          | { p_business_id: string }
          | { p_business_id: string; p_user_id: string }
        Returns: string
      }
      user_business_role: {
        Args: { p_business_id: string }
        Returns: Database["public"]["Enums"]["business_role"]
      }
    }
    Enums: {
      business_role: "owner" | "worker"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue"
      job_status: "Scheduled" | "In Progress" | "Completed"
      job_type: "scheduled" | "time_and_materials"
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
      request_status:
        | "New"
        | "Reviewed"
        | "Scheduled"
        | "Completed"
        | "Declined"
        | "Assessed"
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
      invoice_status: ["Draft", "Sent", "Paid", "Overdue"],
      job_status: ["Scheduled", "In Progress", "Completed"],
      job_type: ["scheduled", "time_and_materials"],
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
      request_status: [
        "New",
        "Reviewed",
        "Scheduled",
        "Completed",
        "Declined",
        "Assessed",
      ],
    },
  },
} as const
