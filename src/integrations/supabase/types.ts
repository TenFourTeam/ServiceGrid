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
      ai_chat_conversations: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
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
            foreignKeyName: "business_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      businesses: {
        Row: {
          ai_credits_used_this_month: number | null
          ai_monthly_credit_limit: number | null
          ai_vision_enabled: boolean | null
          application_fee_bps: number
          clerk_org_id: string | null
          created_at: string
          description: string | null
          est_prefix: string
          est_seq: number
          id: string
          industry: string | null
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
          ai_credits_used_this_month?: number | null
          ai_monthly_credit_limit?: number | null
          ai_vision_enabled?: boolean | null
          application_fee_bps?: number
          clerk_org_id?: string | null
          created_at?: string
          description?: string | null
          est_prefix?: string
          est_seq?: number
          id?: string
          industry?: string | null
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
          ai_credits_used_this_month?: number | null
          ai_monthly_credit_limit?: number | null
          ai_vision_enabled?: boolean | null
          application_fee_bps?: number
          clerk_org_id?: string | null
          created_at?: string
          description?: string | null
          est_prefix?: string
          est_seq?: number
          id?: string
          industry?: string | null
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
      call_logs: {
        Row: {
          ai_handled: boolean | null
          ai_summary: string | null
          business_id: string
          call_sid: string
          created_at: string | null
          customer_id: string | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          from_number: string
          id: string
          phone_number_id: string | null
          recording_url: string | null
          started_at: string | null
          status: string
          to_number: string
          transcript: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_handled?: boolean | null
          ai_summary?: string | null
          business_id: string
          call_sid: string
          created_at?: string | null
          customer_id?: string | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number: string
          id?: string
          phone_number_id?: string | null
          recording_url?: string | null
          started_at?: string | null
          status: string
          to_number: string
          transcript?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_handled?: boolean | null
          ai_summary?: string | null
          business_id?: string
          call_sid?: string
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string
          id?: string
          phone_number_id?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number?: string
          transcript?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          publish_date: string
          reaction_counts: Json | null
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          publish_date: string
          reaction_counts?: Json | null
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          publish_date?: string
          reaction_counts?: Json | null
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      changelog_items: {
        Row: {
          content: string
          created_at: string
          id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          section_id: string
          sort_order: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "changelog_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "changelog_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_sections: {
        Row: {
          created_at: string
          emoji: string
          entry_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          emoji: string
          entry_id: string
          id?: string
          sort_order: number
          title: string
        }
        Update: {
          created_at?: string
          emoji?: string
          entry_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_sections_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts: {
        Row: {
          auth_method: string | null
          clerk_user_id: string | null
          created_at: string | null
          customer_id: string
          email: string
          id: string
          last_login_at: string | null
          magic_token: string | null
          magic_token_expires_at: string | null
          password_hash: string | null
          updated_at: string | null
        }
        Insert: {
          auth_method?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          customer_id: string
          email: string
          id?: string
          last_login_at?: string | null
          magic_token?: string | null
          magic_token_expires_at?: string | null
          password_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_method?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          customer_id?: string
          email?: string
          id?: string
          last_login_at?: string | null
          magic_token?: string | null
          magic_token_expires_at?: string | null
          password_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_invites: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string | null
          customer_id: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          sent_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string | null
          customer_id: string
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          sent_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_invites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sessions: {
        Row: {
          auth_method: string
          created_at: string | null
          customer_account_id: string
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          auth_method: string
          created_at?: string | null
          customer_account_id: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Update: {
          auth_method?: string
          created_at?: string | null
          customer_account_id?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_sessions_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      google_drive_connections: {
        Row: {
          access_token: string | null
          business_id: string
          connected_at: string | null
          created_at: string | null
          google_account_email: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          refresh_token: string | null
          root_folder_id: string | null
          sync_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          business_id: string
          connected_at?: string | null
          created_at?: string | null
          google_account_email: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          refresh_token?: string | null
          root_folder_id?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          business_id?: string
          connected_at?: string | null
          created_at?: string | null
          google_account_email?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          refresh_token?: string | null
          root_folder_id?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_file_mappings: {
        Row: {
          business_id: string
          connection_id: string
          created_at: string | null
          drive_file_id: string
          drive_file_name: string
          drive_folder_id: string | null
          drive_web_content_link: string | null
          drive_web_view_link: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          last_synced_at: string | null
          mime_type: string | null
          sg_entity_id: string
          sg_entity_type: string
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          connection_id: string
          created_at?: string | null
          drive_file_id: string
          drive_file_name: string
          drive_folder_id?: string | null
          drive_web_content_link?: string | null
          drive_web_view_link?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          last_synced_at?: string | null
          mime_type?: string | null
          sg_entity_id: string
          sg_entity_type: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          connection_id?: string
          created_at?: string | null
          drive_file_id?: string
          drive_file_name?: string
          drive_folder_id?: string | null
          drive_web_content_link?: string | null
          drive_web_view_link?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          last_synced_at?: string | null
          mime_type?: string | null
          sg_entity_id?: string
          sg_entity_type?: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_file_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_file_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "google_drive_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_sync_log: {
        Row: {
          business_id: string
          completed_at: string | null
          connection_id: string
          created_at: string | null
          direction: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          items_failed: number | null
          items_processed: number | null
          items_succeeded: number | null
          metadata: Json | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          direction: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_succeeded?: number | null
          metadata?: Json | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          direction?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_succeeded?: number | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_sync_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "google_drive_connections"
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
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "inventory_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "inventory_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
          recurring_schedule_id: string | null
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
          recurring_schedule_id?: string | null
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
          recurring_schedule_id?: string | null
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
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
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
            foreignKeyName: "job_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
          location: unknown
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
          location?: unknown
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
          location?: unknown
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
          {
            foreignKeyName: "lifecycle_emails_sent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
      phone_numbers: {
        Row: {
          ai_agent_config: Json | null
          ai_agent_enabled: boolean | null
          business_hours: Json | null
          business_id: string
          capabilities: Json | null
          created_at: string | null
          friendly_name: string | null
          id: string
          phone_number: string
          status: string | null
          twilio_sid: string
          updated_at: string | null
        }
        Insert: {
          ai_agent_config?: Json | null
          ai_agent_enabled?: boolean | null
          business_hours?: Json | null
          business_id: string
          capabilities?: Json | null
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          phone_number: string
          status?: string | null
          twilio_sid: string
          updated_at?: string | null
        }
        Update: {
          ai_agent_config?: Json | null
          ai_agent_enabled?: boolean | null
          business_hours?: Json | null
          business_id?: string
          capabilities?: Json | null
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          phone_number?: string
          status?: string | null
          twilio_sid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          business_id: string
          created_at: string | null
          emergency_multiplier: number | null
          equipment_markup_percent: number | null
          id: string
          labor_rate_per_hour: number | null
          material_markup_percent: number | null
          minimum_charge: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          emergency_multiplier?: number | null
          equipment_markup_percent?: number | null
          id?: string
          labor_rate_per_hour?: number | null
          material_markup_percent?: number | null
          minimum_charge?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          emergency_multiplier?: number | null
          equipment_markup_percent?: number | null
          id?: string
          labor_rate_per_hour?: number | null
          material_markup_percent?: number | null
          minimum_charge?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
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
      quickbooks_conflict_resolutions: {
        Row: {
          business_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          qb_data: Json
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_data: Json | null
          sg_data: Json
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          qb_data: Json
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_data?: Json | null
          sg_data: Json
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          qb_data?: Json
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_data?: Json | null
          sg_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_conflict_resolutions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_conflict_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_conflict_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quickbooks_connections: {
        Row: {
          access_token: string | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          realm_id: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          realm_id: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          realm_id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_entity_mappings: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          qb_entity_id: string
          qb_sync_token: string | null
          sg_entity_id: string
          sg_entity_type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          qb_entity_id: string
          qb_sync_token?: string | null
          sg_entity_id: string
          sg_entity_type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          qb_entity_id?: string
          qb_sync_token?: string | null
          sg_entity_id?: string
          sg_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_entity_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_field_mappings: {
        Row: {
          business_id: string
          created_at: string | null
          entity_type: string
          id: string
          is_required: boolean | null
          qb_field: string
          sg_field: string
          transform_function: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          is_required?: boolean | null
          qb_field: string
          sg_field: string
          transform_function?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          is_required?: boolean | null
          qb_field?: string
          sg_field?: string
          transform_function?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_field_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_log: {
        Row: {
          business_id: string
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          metadata: Json | null
          records_failed: number | null
          records_processed: number | null
          status: string
          sync_type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          status: string
          sync_type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_schedules: {
        Row: {
          business_id: string
          created_at: string | null
          direction: string | null
          enabled: boolean | null
          entity_type: string
          filters: Json | null
          frequency_minutes: number | null
          id: string
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          direction?: string | null
          enabled?: boolean | null
          entity_type: string
          filters?: Json | null
          frequency_minutes?: number | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          direction?: string | null
          enabled?: boolean | null
          entity_type?: string
          filters?: Json | null
          frequency_minutes?: number | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_webhook_events: {
        Row: {
          business_id: string
          created_at: string | null
          entity_type: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          qb_entity_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity_type: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          qb_entity_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity_type?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          qb_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_webhook_events_business_id_fkey"
            columns: ["business_id"]
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
          last_invoice_date: string | null
          next_billing_date: string
          quote_id: string
          stripe_subscription_id: string | null
          total_invoices_generated: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          frequency: Database["public"]["Enums"]["quote_frequency"]
          id?: string
          is_active?: boolean
          last_invoice_date?: string | null
          next_billing_date: string
          quote_id: string
          stripe_subscription_id?: string | null
          total_invoices_generated?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          frequency?: Database["public"]["Enums"]["quote_frequency"]
          id?: string
          is_active?: boolean
          last_invoice_date?: string | null
          next_billing_date?: string
          quote_id?: string
          stripe_subscription_id?: string | null
          total_invoices_generated?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
      roadmap_features: {
        Row: {
          comment_count: number
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          comment_count?: number
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          comment_count?: number
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: []
      }
      roadmap_votes: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          voter_identifier: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          voter_identifier: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          voter_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_votes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_features"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          infographic_url: string | null
          is_active: boolean
          service_name: string
          unit_price: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          infographic_url?: string | null
          is_active?: boolean
          service_name: string
          unit_price: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          infographic_url?: string | null
          is_active?: boolean
          service_name?: string
          unit_price?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_ai_artifacts: {
        Row: {
          artifact_type: string
          business_id: string
          content_html: string
          content_markdown: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          input_hash: string
          metadata: Json | null
          provenance: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          artifact_type: string
          business_id: string
          content_html: string
          content_markdown: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          input_hash: string
          metadata?: Json | null
          provenance?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          artifact_type?: string
          business_id?: string
          content_html?: string
          content_markdown?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          input_hash?: string
          metadata?: Json | null
          provenance?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_ai_artifacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_ai_artifacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_ai_artifacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sg_ai_generations: {
        Row: {
          business_id: string
          confidence: string | null
          created_at: string
          feedback_rating: number | null
          feedback_text: string | null
          final_version: Json | null
          generation_type: string
          id: string
          input_params: Json
          job_id: string | null
          metadata: Json
          output_data: Json
          source_media_id: string
          user_id: string
          was_edited: boolean | null
        }
        Insert: {
          business_id: string
          confidence?: string | null
          created_at?: string
          feedback_rating?: number | null
          feedback_text?: string | null
          final_version?: Json | null
          generation_type: string
          id?: string
          input_params?: Json
          job_id?: string | null
          metadata?: Json
          output_data?: Json
          source_media_id: string
          user_id: string
          was_edited?: boolean | null
        }
        Update: {
          business_id?: string
          confidence?: string | null
          created_at?: string
          feedback_rating?: number | null
          feedback_text?: string | null
          final_version?: Json | null
          generation_type?: string
          id?: string
          input_params?: Json
          job_id?: string | null
          metadata?: Json
          output_data?: Json
          source_media_id?: string
          user_id?: string
          was_edited?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_ai_generations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_ai_generations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_ai_generations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "sg_ai_generations_source_media_id_fkey"
            columns: ["source_media_id"]
            isOneToOne: false
            referencedRelation: "sg_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sg_checklist_events: {
        Row: {
          checklist_id: string
          created_at: string
          event_type: string
          id: string
          item_id: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          event_type: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          event_type?: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_checklist_events_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "sg_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_events_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "time_by_task_report"
            referencedColumns: ["checklist_id"]
          },
          {
            foreignKeyName: "sg_checklist_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sg_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "time_by_task_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sg_checklist_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sg_checklist_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_completed: boolean | null
          position: number
          required_photo_count: number | null
          time_spent_minutes: number | null
          timesheet_entry_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          position: number
          required_photo_count?: number | null
          time_spent_minutes?: number | null
          timesheet_entry_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          position?: number
          required_photo_count?: number | null
          time_spent_minutes?: number | null
          timesheet_entry_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "sg_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "time_by_task_report"
            referencedColumns: ["checklist_id"]
          },
          {
            foreignKeyName: "sg_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklist_items_timesheet_entry_id_fkey"
            columns: ["timesheet_entry_id"]
            isOneToOne: false
            referencedRelation: "timesheet_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_checklist_template_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          position: number
          required_photo_count: number | null
          template_id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          position: number
          required_photo_count?: number | null
          template_id: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          position?: number
          required_photo_count?: number | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sg_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_checklist_templates: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          is_system_template: boolean | null
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_system_template?: boolean | null
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_system_template?: boolean | null
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sg_checklist_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sg_checklists: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          job_id: string
          started_at: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          job_id: string
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          job_id?: string
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_checklists_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklists_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "sg_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sg_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_conversation_reads: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sg_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_conversations: {
        Row: {
          business_id: string
          created_at: string | null
          created_by: string
          customer_id: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_by: string
          customer_id?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_by?: string
          customer_id?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_documents: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          customer_id: string | null
          document_type: string
          file_size: number
          id: string
          job_id: string | null
          mime_type: string
          public_url: string
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          customer_id?: string | null
          document_type: string
          file_size: number
          id?: string
          job_id?: string | null
          mime_type: string
          public_url: string
          storage_path: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          document_type?: string
          file_size?: number
          id?: string
          job_id?: string | null
          mime_type?: string
          public_url?: string
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
        ]
      }
      sg_esign_envelopes: {
        Row: {
          audit_trail: Json | null
          business_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          document_id: string
          id: string
          metadata: Json | null
          provider: string
          provider_envelope_id: string | null
          recipients: Json
          sent_at: string | null
          signed_document_url: string | null
          status: string
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          audit_trail?: Json | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          document_id: string
          id?: string
          metadata?: Json | null
          provider: string
          provider_envelope_id?: string | null
          recipients?: Json
          sent_at?: string | null
          signed_document_url?: string | null
          status?: string
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          audit_trail?: Json | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_envelope_id?: string | null
          recipients?: Json
          sent_at?: string | null
          signed_document_url?: string | null
          status?: string
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_esign_envelopes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_esign_envelopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_esign_envelopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_esign_envelopes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sg_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_media: {
        Row: {
          annotated_image_url: string | null
          annotations: Json | null
          business_id: string
          checklist_item_id: string | null
          content_hash: string | null
          conversation_id: string | null
          created_at: string
          file_size: number
          file_type: string
          generation_metadata: Json | null
          has_annotations: boolean | null
          hls_manifest_url: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          mime_type: string
          note_id: string | null
          original_filename: string
          public_url: string | null
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          upload_status: string
          user_id: string
        }
        Insert: {
          annotated_image_url?: string | null
          annotations?: Json | null
          business_id: string
          checklist_item_id?: string | null
          content_hash?: string | null
          conversation_id?: string | null
          created_at?: string
          file_size: number
          file_type: string
          generation_metadata?: Json | null
          has_annotations?: boolean | null
          hls_manifest_url?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          mime_type: string
          note_id?: string | null
          original_filename: string
          public_url?: string | null
          storage_path: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_status?: string
          user_id: string
        }
        Update: {
          annotated_image_url?: string | null
          annotations?: Json | null
          business_id?: string
          checklist_item_id?: string | null
          content_hash?: string | null
          conversation_id?: string | null
          created_at?: string
          file_size?: number
          file_type?: string
          generation_metadata?: Json | null
          has_annotations?: boolean | null
          hls_manifest_url?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          mime_type?: string
          note_id?: string | null
          original_filename?: string
          public_url?: string | null
          storage_path?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_media_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "sg_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_media_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "time_by_task_report"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sg_media_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sg_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "sg_media_page_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "sg_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sg_media_tags: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          tag_color: string | null
          tag_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          tag_color?: string | null
          tag_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          tag_color?: string | null
          tag_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_media_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_messages: {
        Row: {
          attachments: Json | null
          business_id: string
          content: string | null
          conversation_id: string
          created_at: string | null
          edited: boolean | null
          id: string
          mentions: Json | null
          metadata: Json | null
          sender_id: string
          sender_type: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          business_id: string
          content?: string | null
          conversation_id: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          mentions?: Json | null
          metadata?: Json | null
          sender_id: string
          sender_type?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          business_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          mentions?: Json | null
          metadata?: Json | null
          sender_id?: string
          sender_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sg_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_note_collaborators: {
        Row: {
          cursor_position: Json | null
          id: string
          is_viewing: boolean | null
          last_edited_at: string | null
          last_viewed_at: string | null
          note_id: string
          user_id: string
        }
        Insert: {
          cursor_position?: Json | null
          id?: string
          is_viewing?: boolean | null
          last_edited_at?: string | null
          last_viewed_at?: string | null
          note_id: string
          user_id: string
        }
        Update: {
          cursor_position?: Json | null
          id?: string
          is_viewing?: boolean | null
          last_edited_at?: string | null
          last_viewed_at?: string | null
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_page_collaborators_page_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "sg_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_page_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_page_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sg_note_versions: {
        Row: {
          change_summary: string | null
          content_json: Json
          created_at: string
          created_by: string
          id: string
          note_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content_json: Json
          created_at?: string
          created_by: string
          id?: string
          note_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content_json?: Json
          created_at?: string
          created_by?: string
          id?: string
          note_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sg_page_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_page_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_page_versions_page_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "sg_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_notes: {
        Row: {
          business_id: string
          content_json: Json
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_archived: boolean
          job_id: string | null
          parent_note_id: string | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          content_json?: Json
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          job_id?: string | null
          parent_note_id?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          content_json?: Json
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          job_id?: string | null
          parent_note_id?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_pages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "sg_pages_parent_page_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "sg_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_timeline_shares: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          filters_json: Json | null
          id: string
          is_active: boolean
          last_viewed_at: string | null
          title: string
          token: string
          updated_at: string
          view_count: number
          watermark_settings: Json | null
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          filters_json?: Json | null
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          title: string
          token: string
          updated_at?: string
          view_count?: number
          watermark_settings?: Json | null
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          filters_json?: Json | null
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          title?: string
          token?: string
          updated_at?: string
          view_count?: number
          watermark_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_timeline_shares_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_timeline_shares_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_timeline_shares_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
          {
            foreignKeyName: "team_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "time_off_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_off_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
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
          job_id: string | null
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
          job_id?: string | null
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
          job_id?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
        ]
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
      voip_devices: {
        Row: {
          business_id: string
          created_at: string | null
          device_name: string
          device_type: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          push_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          device_name: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          push_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          device_name?: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          push_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voip_devices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voip_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voip_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      daily_time_breakdown: {
        Row: {
          business_id: string | null
          job_address: string | null
          job_id: string | null
          job_title: string | null
          task_categories: Json | null
          task_minutes: number | null
          tasks_completed: number | null
          timesheet_minutes: number | null
          user_id: string | null
          user_name: string | null
          work_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      task_category_breakdown: {
        Row: {
          avg_minutes_per_task: number | null
          business_id: string | null
          category: string | null
          completion_date: string | null
          task_count: number | null
          tasks: Json | null
          total_minutes: number | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_checklist_items_completed_by_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_items_completed_by_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_by_job_report: {
        Row: {
          business_id: string | null
          job_id: string | null
          job_title: string | null
          total_entries: number | null
          total_minutes: number | null
          unique_workers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_by_task_report: {
        Row: {
          business_id: string | null
          checklist_id: string | null
          checklist_title: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          item_id: string | null
          item_title: string | null
          job_id: string | null
          job_title: string | null
          time_spent_minutes: number | null
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
            foreignKeyName: "sg_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_productivity_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sg_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sg_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
        ]
      }
      unified_assignments: {
        Row: {
          assigned_at: string | null
          assignment_type: string | null
          business_id: string | null
          checklist_id: string | null
          item_id: string | null
          item_title: string | null
          job_id: string | null
          job_title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_productivity_report: {
        Row: {
          business_id: string | null
          full_name: string | null
          task_minutes: number | null
          tasks_completed: number | null
          tasks_per_hour: number | null
          timesheet_entries: number | null
          timesheet_minutes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_time_breakdown: {
        Row: {
          all_task_categories: Json | null
          business_id: string | null
          job_id: string | null
          job_title: string | null
          total_task_minutes: number | null
          total_tasks_completed: number | null
          total_timesheet_minutes: number | null
          user_id: string | null
          user_name: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "time_by_job_report"
            referencedColumns: ["job_id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      can_access_customer_contact_info: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      can_manage_business: { Args: { p_business_id: string }; Returns: boolean }
      current_clerk_user_id: { Args: never; Returns: string }
      current_user_profile_id: { Args: never; Returns: string }
      debug_auth_state: { Args: never; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_default_business: {
        Args: never
        Returns: {
          ai_credits_used_this_month: number | null
          ai_monthly_credit_limit: number | null
          ai_vision_enabled: boolean | null
          application_fee_bps: number
          clerk_org_id: string | null
          created_at: string
          description: string | null
          est_prefix: string
          est_seq: number
          id: string
          industry: string | null
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
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_slug: { Args: { input_text: string }; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_subscription_info: {
        Args: { p_business_id: string; p_customer_id: string }
        Returns: {
          frequency: Database["public"]["Enums"]["quote_frequency"]
          next_billing_date: string
          quote_id: string
          subscription_id: string
        }[]
      }
      get_conversations_with_preview: {
        Args: { p_business_id: string }
        Returns: {
          business_id: string
          created_at: string
          created_by: string
          customer_id: string
          customer_name: string
          id: string
          is_archived: boolean
          last_message_at: string
          latest_message: string
          latest_sender_name: string
          latest_sender_type: string
          metadata: Json
          title: string
          unread_count: number
          updated_at: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_active_subscription: {
        Args: { p_business_id: string; p_customer_id: string }
        Returns: boolean
      }
      has_business_permission: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: boolean
      }
      is_business_member: { Args: { p_business_id: string }; Returns: boolean }
      jobs_within_polygon: {
        Args: {
          p_business_id: string
          p_polygon_coords: Json
          p_user_id?: string
        }
        Returns: {
          address: string
          customer_id: string
          customer_name: string
          ends_at: string
          id: string
          latitude: number
          longitude: number
          starts_at: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
        }[]
      }
      jobs_within_radius: {
        Args: {
          p_business_id: string
          p_lat: number
          p_lng: number
          p_radius_meters: number
          p_user_id?: string
        }
        Returns: {
          address: string
          customer_id: string
          customer_name: string
          distance_meters: number
          ends_at: string
          id: string
          latitude: number
          longitude: number
          starts_at: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
        }[]
      }
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
      longtransactionsenabled: { Args: never; Returns: boolean }
      next_est_number: { Args: { p_business_id: string }; Returns: string }
      next_inv_number:
        | { Args: { p_business_id: string }; Returns: string }
        | {
            Args: { p_business_id: string; p_user_id: string }
            Returns: string
          }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      reset_monthly_ai_credits: { Args: never; Returns: undefined }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      supersede_previous_quotes: {
        Args: {
          p_business_id: string
          p_customer_id: string
          p_is_subscription?: boolean
          p_new_quote_id: string
        }
        Returns: undefined
      }
      sync_job_checklist_assignments: {
        Args: { p_assign?: boolean; p_job_id: string; p_user_ids: string[] }
        Returns: undefined
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
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
      job_type: "appointment" | "time_and_materials" | "estimate"
      payment_status: "Succeeded" | "Failed"
      payment_terms: "due_on_receipt" | "net_15" | "net_30" | "net_60"
      quote_frequency:
        | "one-off"
        | "bi-monthly"
        | "monthly"
        | "bi-yearly"
        | "yearly"
        | "weekly"
        | "quarterly"
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
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      job_type: ["appointment", "time_and_materials", "estimate"],
      payment_status: ["Succeeded", "Failed"],
      payment_terms: ["due_on_receipt", "net_15", "net_30", "net_60"],
      quote_frequency: [
        "one-off",
        "bi-monthly",
        "monthly",
        "bi-yearly",
        "yearly",
        "weekly",
        "quarterly",
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
