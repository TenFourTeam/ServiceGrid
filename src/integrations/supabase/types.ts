export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string
          est_prefix: string
          est_seq: number
          id: string
          inv_prefix: string
          inv_seq: number
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          reply_to_email: string | null
          tax_rate_default: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          est_prefix?: string
          est_seq?: number
          id?: string
          inv_prefix?: string
          inv_seq?: number
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          reply_to_email?: string | null
          tax_rate_default?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          est_prefix?: string
          est_seq?: number
          id?: string
          inv_prefix?: string
          inv_seq?: number
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          reply_to_email?: string | null
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
      jobs: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          customer_id: string
          ends_at: string
          id: string
          notes: string | null
          owner_id: string
          quote_id: string | null
          recurrence: string | null
          starts_at: string
          status: Database["public"]["Enums"]["job_status"]
          total: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          customer_id: string
          ends_at: string
          id?: string
          notes?: string | null
          owner_id: string
          quote_id?: string | null
          recurrence?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["job_status"]
          total?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string
          ends_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          quote_id?: string | null
          recurrence?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["job_status"]
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
        ]
      }
      mail_sends: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
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
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_default_business: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          est_prefix: string
          est_seq: number
          id: string
          inv_prefix: string
          inv_seq: number
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          reply_to_email: string | null
          tax_rate_default: number
          updated_at: string
        }
      }
      next_est_number: {
        Args: { p_business_id: string }
        Returns: string
      }
      next_inv_number: {
        Args: { p_business_id: string }
        Returns: string
      }
    }
    Enums: {
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue"
      job_status: "Scheduled" | "In Progress" | "Completed"
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
      invoice_status: ["Draft", "Sent", "Paid", "Overdue"],
      job_status: ["Scheduled", "In Progress", "Completed"],
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
    },
  },
} as const
