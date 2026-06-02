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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          child_id: string
          created_at: string
          created_by: string
          earned_at: string
          family_id: string
          id: string
          kind: string | null
          notes: string | null
          title: string
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by: string
          earned_at?: string
          family_id: string
          id?: string
          kind?: string | null
          notes?: string | null
          title: string
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string
          earned_at?: string
          family_id?: string
          id?: string
          kind?: string | null
          notes?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_entitlements: {
        Row: {
          expires_at: string | null
          family_id: string
          insights_enabled: boolean
          ocr_monthly_quota: number
          plan: string
          updated_at: string
        }
        Insert: {
          expires_at?: string | null
          family_id: string
          insights_enabled?: boolean
          ocr_monthly_quota?: number
          plan?: string
          updated_at?: string
        }
        Update: {
          expires_at?: string | null
          family_id?: string
          insights_enabled?: boolean
          ocr_monthly_quota?: number
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_entitlements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_fees: {
        Row: {
          amount: number
          apartment_id: string
          created_at: string
          created_by: string | null
          due_date: string
          fee_type: Database["public"]["Enums"]["fee_type"]
          id: string
          note: string | null
          paid_amount: number
          period: string
          project_id: string
          status: Database["public"]["Enums"]["fee_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          apartment_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          fee_type: Database["public"]["Enums"]["fee_type"]
          id?: string
          note?: string | null
          paid_amount?: number
          period: string
          project_id: string
          status?: Database["public"]["Enums"]["fee_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          apartment_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          note?: string | null
          paid_amount?: number
          period?: string
          project_id?: string
          status?: Database["public"]["Enums"]["fee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_fees_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_fees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_residents: {
        Row: {
          apartment_id: string
          created_at: string
          family_id: string
          id: string
          is_primary: boolean
          move_in_date: string
          move_out_date: string | null
          notes: string | null
          relation: string
          updated_at: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          family_id: string
          id?: string
          is_primary?: boolean
          move_in_date?: string
          move_out_date?: string | null
          notes?: string | null
          relation?: string
          updated_at?: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          family_id?: string
          id?: string
          is_primary?: boolean
          move_in_date?: string
          move_out_date?: string | null
          notes?: string | null
          relation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_residents_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_residents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          block_id: string
          code: string
          created_at: string
          floor_id: string
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          block_id: string
          code: string
          created_at?: string
          floor_id: string
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          block_id?: string
          code?: string
          created_at?: string
          floor_id?: string
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartments_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_logs: {
        Row: {
          app: string
          context: Json
          created_at: string
          device_info: Json
          id: number
          level: string
          message: string
          request_id: string | null
          session_id: string | null
          ts: string
          user_id: string | null
        }
        Insert: {
          app: string
          context?: Json
          created_at?: string
          device_info?: Json
          id?: never
          level: string
          message: string
          request_id?: string | null
          session_id?: string | null
          ts?: string
          user_id?: string | null
        }
        Update: {
          app?: string
          context?: Json
          created_at?: string
          device_info?: Json
          id?: never
          level?: string
          message?: string
          request_id?: string | null
          session_id?: string | null
          ts?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_logs_default: {
        Row: {
          app: string
          context: Json
          created_at: string
          device_info: Json
          id: number
          level: string
          message: string
          request_id: string | null
          session_id: string | null
          ts: string
          user_id: string | null
        }
        Insert: {
          app: string
          context?: Json
          created_at?: string
          device_info?: Json
          id?: never
          level: string
          message: string
          request_id?: string | null
          session_id?: string | null
          ts?: string
          user_id?: string | null
        }
        Update: {
          app?: string
          context?: Json
          created_at?: string
          device_info?: Json
          id?: never
          level?: string
          message?: string
          request_id?: string | null
          session_id?: string | null
          ts?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          project_id: string
          total_floors: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          total_floors?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          total_floors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      care_notes: {
        Row: {
          author_name: string
          content: string
          created_at: string
          created_by: string
          elderly_id: string
          family_id: string
          id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          created_by: string
          elderly_id: string
          family_id: string
          id?: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          created_by?: string
          elderly_id?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_elderly_id_fkey"
            columns: ["elderly_id"]
            isOneToOne: false
            referencedRelation: "elderly_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          avatar: string | null
          created_at: string
          created_by: string
          dob: string | null
          family_id: string
          grade: string | null
          id: string
          name: string
          notes: string | null
          school: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          created_by: string
          dob?: string | null
          family_id: string
          grade?: string | null
          id?: string
          name: string
          notes?: string | null
          school?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          created_by?: string
          dob?: string | null
          family_id?: string
          grade?: string | null
          id?: string
          name?: string
          notes?: string | null
          school?: string | null
        }
        Relationships: []
      }
      community_events: {
        Row: {
          active: boolean
          capacity: number | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          place: string
          project_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          place?: string
          project_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          place?: string
          project_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      community_services: {
        Row: {
          active: boolean
          base_price: number | null
          category: string | null
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          project_id: string | null
          slug: string
          sort_order: number
          tag: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number | null
          category?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          project_id?: string | null
          slug: string
          sort_order?: number
          tag?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number | null
          category?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          project_id?: string | null
          slug?: string
          sort_order?: number
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          project_name: string | null
          role: string | null
          scale: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          project_name?: string | null
          role?: string | null
          scale?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          project_name?: string | null
          role?: string | null
          scale?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      elderly_profiles: {
        Row: {
          address: string | null
          age: number | null
          avatar: string | null
          conditions: string[]
          created_at: string
          created_by: string
          doctor: string | null
          family_id: string
          id: string
          name: string
          phone: string | null
          relation: string | null
          safe_last_at: string | null
          safe_note: string | null
          safe_status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar?: string | null
          conditions?: string[]
          created_at?: string
          created_by: string
          doctor?: string | null
          family_id: string
          id?: string
          name: string
          phone?: string | null
          relation?: string | null
          safe_last_at?: string | null
          safe_note?: string | null
          safe_status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar?: string | null
          conditions?: string[]
          created_at?: string
          created_by?: string
          doctor?: string | null
          family_id?: string
          id?: string
          name?: string
          phone?: string | null
          relation?: string | null
          safe_last_at?: string | null
          safe_note?: string | null
          safe_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          family_id: string | null
          guests_count: number
          id: string
          note: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          family_id?: string | null
          guests_count?: number
          id?: string
          note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          family_id?: string | null
          guests_count?: number
          id?: string
          note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_ai_insights: {
        Row: {
          anomalies: Json
          family_id: string
          generated_at: string
          id: string
          model: string | null
          period_month: string
          recommendations: Json
          summary: string
          top_categories: Json
        }
        Insert: {
          anomalies?: Json
          family_id: string
          generated_at?: string
          id?: string
          model?: string | null
          period_month: string
          recommendations?: Json
          summary: string
          top_categories?: Json
        }
        Update: {
          anomalies?: Json
          family_id?: string
          generated_at?: string
          id?: string
          model?: string | null
          period_month?: string
          recommendations?: Json
          summary?: string
          top_categories?: Json
        }
        Relationships: [
          {
            foreignKeyName: "expense_ai_insights_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_anomalies: {
        Row: {
          anomaly_type: string
          detected_at: string
          expense_id: string | null
          family_id: string
          id: string
          reason: string
          resolved: boolean
          severity: string
        }
        Insert: {
          anomaly_type: string
          detected_at?: string
          expense_id?: string | null
          family_id: string
          id?: string
          reason: string
          resolved?: boolean
          severity?: string
        }
        Update: {
          anomaly_type?: string
          detected_at?: string
          expense_id?: string | null
          family_id?: string
          id?: string
          reason?: string
          resolved?: boolean
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_anomalies_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_anomalies_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_budgets: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          id: string
          month: string
          per_category: Json
          total_amount: number
          updated_at: string
          warning_threshold: number
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          month: string
          per_category?: Json
          total_amount?: number
          updated_at?: string
          warning_threshold?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          month?: string
          per_category?: Json
          total_amount?: number
          updated_at?: string
          warning_threshold?: number
        }
        Relationships: []
      }
      expense_recurring_rules: {
        Row: {
          active: boolean
          amount: number
          category: string
          created_at: string
          created_by: string
          day_of_month: number | null
          family_id: string
          frequency: string
          id: string
          last_run_at: string | null
          merchant: string | null
          next_run_at: string
          note: string | null
          payer_id: string | null
          payment_method: string | null
          title: string
          updated_at: string
          weekday: number | null
        }
        Insert: {
          active?: boolean
          amount: number
          category?: string
          created_at?: string
          created_by: string
          day_of_month?: number | null
          family_id: string
          frequency: string
          id?: string
          last_run_at?: string | null
          merchant?: string | null
          next_run_at?: string
          note?: string | null
          payer_id?: string | null
          payment_method?: string | null
          title: string
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          family_id?: string
          frequency?: string
          id?: string
          last_run_at?: string | null
          merchant?: string | null
          next_run_at?: string
          note?: string | null
          payer_id?: string | null
          payment_method?: string | null
          title?: string
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_recurring_rules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_share_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit_all: boolean
          can_manage_budget: boolean
          can_manage_recurring: boolean
          can_view: boolean
          created_at: string
          family_id: string
          id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit_all?: boolean
          can_manage_budget?: boolean
          can_manage_recurring?: boolean
          can_view?: boolean
          created_at?: string
          family_id: string
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit_all?: boolean
          can_manage_budget?: boolean
          can_manage_recurring?: boolean
          can_view?: boolean
          created_at?: string
          family_id?: string
          id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_share_permissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          family_id: string
          id: string
          is_recurring: boolean
          is_shared: boolean
          merchant: string | null
          note: string | null
          payer_id: string | null
          payment_method: string | null
          receipt_url: string | null
          spent_on: string
          title: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          is_recurring?: boolean
          is_shared?: boolean
          merchant?: string | null
          note?: string | null
          payer_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          spent_on?: string
          title: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          is_recurring?: boolean
          is_shared?: boolean
          merchant?: string | null
          note?: string | null
          payer_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          spent_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          apartment: string | null
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          apartment?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          apartment?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      family_contacts: {
        Row: {
          created_at: string
          family_id: string
          icon: string
          id: string
          label: string
          name: string
          phone: string
          slot_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          family_id: string
          icon?: string
          id?: string
          label: string
          name: string
          phone: string
          slot_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          family_id?: string
          icon?: string
          id?: string
          label?: string
          name?: string
          phone?: string
          slot_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      family_events: {
        Row: {
          all_day: boolean
          category: string
          created_at: string
          created_by: string
          ends_at: string | null
          family_id: string
          id: string
          location: string | null
          member_name: string | null
          member_scope: string
          notes: string | null
          remind_minutes_before: number | null
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          all_day?: boolean
          category?: string
          created_at?: string
          created_by: string
          ends_at?: string | null
          family_id: string
          id?: string
          location?: string | null
          member_name?: string | null
          member_scope?: string
          notes?: string | null
          remind_minutes_before?: number | null
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          all_day?: boolean
          category?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          family_id?: string
          id?: string
          location?: string | null
          member_name?: string | null
          member_scope?: string
          notes?: string | null
          remind_minutes_before?: number | null
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      family_helper_activity: {
        Row: {
          created_at: string
          detail: string | null
          helper_id: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          helper_id: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          helper_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_helper_activity_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "family_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      family_helper_attendance: {
        Row: {
          att_date: string
          created_at: string
          helper_id: string
          id: string
          status: string
        }
        Insert: {
          att_date: string
          created_at?: string
          helper_id: string
          id?: string
          status: string
        }
        Update: {
          att_date?: string
          created_at?: string
          helper_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_helper_attendance_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "family_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      family_helper_payments: {
        Row: {
          amount: number
          created_at: string
          helper_id: string
          id: string
          month: string
          paid_at: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          helper_id: string
          id?: string
          month: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          helper_id?: string
          id?: string
          month?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_helper_payments_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "family_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      family_helper_tasks: {
        Row: {
          created_at: string
          done: boolean
          helper_id: string
          icon: string | null
          id: string
          task_date: string
          time: string | null
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          helper_id: string
          icon?: string | null
          id?: string
          task_date?: string
          time?: string | null
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          helper_id?: string
          icon?: string | null
          id?: string
          task_date?: string
          time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_helper_tasks_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "family_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      family_helpers: {
        Row: {
          avatar: string | null
          created_at: string
          family_id: string
          hometown: string | null
          id: string
          id_number: string | null
          name: string
          permissions: Json
          phone: string | null
          rating: number | null
          role: string | null
          salary: number
          schedule: Json
          start_date: string | null
          status: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          family_id: string
          hometown?: string | null
          id?: string
          id_number?: string | null
          name: string
          permissions?: Json
          phone?: string | null
          rating?: number | null
          role?: string | null
          salary?: number
          schedule?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          avatar?: string | null
          created_at?: string
          family_id?: string
          hometown?: string | null
          id?: string
          id_number?: string | null
          name?: string
          permissions?: Json
          phone?: string | null
          rating?: number | null
          role?: string | null
          salary?: number
          schedule?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "family_helpers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          age: number | null
          avatar: string | null
          created_at: string
          family_id: string
          id: string
          member_role: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          age?: number | null
          avatar?: string | null
          created_at?: string
          family_id: string
          id?: string
          member_role?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          age?: number | null
          avatar?: string | null
          created_at?: string
          family_id?: string
          id?: string
          member_role?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_moments: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          family_id: string
          id: string
          media_type: string
          media_url: string
          tagged_member_ids: Json
          taken_at: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          media_type?: string
          media_url: string
          tagged_member_ids?: Json
          taken_at?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          media_type?: string
          media_url?: string
          tagged_member_ids?: Json
          taken_at?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_trip_items: {
        Row: {
          amount: number | null
          assignee: string | null
          created_at: string
          done: boolean
          id: string
          kind: string
          label: string
          position: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          assignee?: string | null
          created_at?: string
          done?: boolean
          id?: string
          kind: string
          label: string
          position?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          assignee?: string | null
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          label?: string
          position?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_trip_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "family_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      family_trips: {
        Row: {
          budget_planned: number
          created_at: string
          created_by: string | null
          destination: string | null
          end_date: string | null
          family_id: string
          id: string
          members_count: number
          notes: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_planned?: number
          created_at?: string
          created_by?: string | null
          destination?: string | null
          end_date?: string | null
          family_id: string
          id?: string
          members_count?: number
          notes?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_planned?: number
          created_at?: string
          created_by?: string | null
          destination?: string | null
          end_date?: string | null
          family_id?: string
          id?: string
          members_count?: number
          notes?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_trips_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          apartment_id: string
          created_at: string
          fee_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          project_id: string
          receipt_no: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          apartment_id: string
          created_at?: string
          fee_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          project_id: string
          receipt_no: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          apartment_id?: string
          created_at?: string
          fee_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          project_id?: string
          receipt_no?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "apartment_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          block_id: string
          created_at: string
          floor_number: number
          id: string
          name: string | null
          project_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          floor_number: number
          id?: string
          name?: string | null
          project_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          floor_number?: number
          id?: string
          name?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          expires_on: string | null
          family_id: string
          id: string
          location: string | null
          name: string
          notes: string | null
          qty: number | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          expires_on?: string | null
          family_id: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          qty?: number | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          expires_on?: string | null
          family_id?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          qty?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      guard_shifts: {
        Row: {
          check_in_at: string | null
          check_in_location: Json | null
          check_out_at: string | null
          check_out_location: Json | null
          created_at: string
          end_at: string
          guard_id: string
          id: string
          notes: string | null
          project_id: string | null
          shift_date: string
          shift_type: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string | null
          check_in_location?: Json | null
          check_out_at?: string | null
          check_out_location?: Json | null
          created_at?: string
          end_at: string
          guard_id: string
          id?: string
          notes?: string | null
          project_id?: string | null
          shift_date?: string
          shift_type: string
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string | null
          check_in_location?: Json | null
          check_out_at?: string | null
          check_out_location?: Json | null
          created_at?: string
          end_at?: string
          guard_id?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          shift_date?: string
          shift_type?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          checks: Json
          created_at: string
          duration_ms: number
          id: number
          status: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          duration_ms?: number
          id?: never
          status: string
        }
        Update: {
          checks?: Json
          created_at?: string
          duration_ms?: number
          id?: never
          status?: string
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          allergies_enc: string | null
          blood_type_enc: string | null
          conditions_enc: string | null
          created_at: string
          created_by: string
          dob: string | null
          family_id: string
          id: string
          member_id: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          allergies_enc?: string | null
          blood_type_enc?: string | null
          conditions_enc?: string | null
          created_at?: string
          created_by: string
          dob?: string | null
          family_id: string
          id?: string
          member_id?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          allergies_enc?: string | null
          blood_type_enc?: string | null
          conditions_enc?: string | null
          created_at?: string
          created_by?: string
          dob?: string | null
          family_id?: string
          id?: string
          member_id?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          id: string
          kind: string
          member_name: string
          notes: string | null
          recorded_at: string
          title: string
          value: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          kind: string
          member_name: string
          notes?: string | null
          recorded_at?: string
          title: string
          value?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          kind?: string
          member_name?: string
          notes?: string | null
          recorded_at?: string
          title?: string
          value?: string | null
        }
        Relationships: []
      }
      homeworks: {
        Row: {
          child_id: string
          created_at: string
          created_by: string
          done: boolean
          due_date: string | null
          family_id: string
          id: string
          notes: string | null
          subject: string
          title: string
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by: string
          done?: boolean
          due_date?: string | null
          family_id: string
          id?: string
          notes?: string | null
          subject: string
          title: string
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string
          done?: boolean
          due_date?: string | null
          family_id?: string
          id?: string
          notes?: string | null
          subject?: string
          title?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          photos: Json | null
          project_id: string | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          photos?: Json | null
          project_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          photos?: Json | null
          project_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_appointments: {
        Row: {
          created_at: string
          created_by: string
          doctor: string | null
          family_id: string
          id: string
          location: string | null
          member_name: string
          notes: string | null
          remind_hours_before: number | null
          reminded_at: string | null
          scheduled_at: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          doctor?: string | null
          family_id: string
          id?: string
          location?: string | null
          member_name: string
          notes?: string | null
          remind_hours_before?: number | null
          reminded_at?: string | null
          scheduled_at: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          doctor?: string | null
          family_id?: string
          id?: string
          location?: string | null
          member_name?: string
          notes?: string | null
          remind_hours_before?: number | null
          reminded_at?: string | null
          scheduled_at?: string
          status?: string
        }
        Relationships: []
      }
      medicine_logs: {
        Row: {
          family_id: string
          id: string
          note: string | null
          reminder_id: string
          taken_at: string
          taken_by: string
        }
        Insert: {
          family_id: string
          id?: string
          note?: string | null
          reminder_id: string
          taken_at?: string
          taken_by: string
        }
        Update: {
          family_id?: string
          id?: string
          note?: string | null
          reminder_id?: string
          taken_at?: string
          taken_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "medicine_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_reminders: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          days_of_week: string | null
          dosage: string | null
          family_id: string
          id: string
          medicine: string
          member_name: string
          notes: string | null
          time_of_day: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          days_of_week?: string | null
          dosage?: string | null
          family_id: string
          id?: string
          medicine: string
          member_name: string
          notes?: string | null
          time_of_day?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          days_of_week?: string | null
          dosage?: string | null
          family_id?: string
          id?: string
          medicine?: string
          member_name?: string
          notes?: string | null
          time_of_day?: string | null
        }
        Relationships: []
      }
      moment_comments: {
        Row: {
          body: string
          created_at: string
          family_id: string
          id: string
          moment_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          family_id: string
          id?: string
          moment_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          family_id?: string
          id?: string
          moment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_comments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "family_moments"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_reactions: {
        Row: {
          created_at: string
          emoji: string
          family_id: string
          id: string
          moment_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          family_id: string
          id?: string
          moment_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          family_id?: string
          id?: string
          moment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_reactions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "family_moments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          medicine_enabled: boolean
          parent_reminder_enabled: boolean
          quiet_end: string
          quiet_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          medicine_enabled?: boolean
          parent_reminder_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          medicine_enabled?: boolean
          parent_reminder_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string
          due_at: string | null
          family_id: string | null
          id: string
          read_at: string | null
          ref_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key: string
          due_at?: string | null
          family_id?: string | null
          id?: string
          read_at?: string | null
          ref_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string
          due_at?: string | null
          family_id?: string | null
          id?: string
          read_at?: string | null
          ref_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_reminders: {
        Row: {
          child_id: string | null
          created_at: string
          created_by: string
          done: boolean
          family_id: string
          id: string
          notes: string | null
          remind_at: string
          title: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          created_by: string
          done?: boolean
          family_id: string
          id?: string
          notes?: string | null
          remind_at: string
          title: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          created_by?: string
          done?: boolean
          family_id?: string
          id?: string
          notes?: string | null
          remind_at?: string
          title?: string
        }
        Relationships: []
      }
      patrol_logs: {
        Row: {
          checkpoint_code: string
          created_at: string
          guard_id: string
          id: string
          location: Json | null
          notes: string | null
          photo_url: string | null
          project_id: string | null
          route_code: string | null
          scan_method: string
          scanned_at: string
          shift_id: string | null
        }
        Insert: {
          checkpoint_code: string
          created_at?: string
          guard_id: string
          id?: string
          location?: Json | null
          notes?: string | null
          photo_url?: string | null
          project_id?: string | null
          route_code?: string | null
          scan_method?: string
          scanned_at?: string
          shift_id?: string | null
        }
        Update: {
          checkpoint_code?: string
          created_at?: string
          guard_id?: string
          id?: string
          location?: Json | null
          notes?: string | null
          photo_url?: string | null
          project_id?: string | null
          route_code?: string | null
          scan_method?: string
          scanned_at?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_logs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "guard_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_upgrade_requests: {
        Row: {
          created_at: string
          family_id: string
          id: string
          note: string | null
          plan: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          note?: string | null
          plan?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          note?: string | null
          plan?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_upgrade_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apartment_no: string | null
          avatar_url: string | null
          building_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          head_name: string | null
          id: string
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          apartment_no?: string | null
          avatar_url?: string | null
          building_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          head_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          apartment_no?: string | null
          avatar_url?: string | null
          building_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          head_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      receipt_ocr_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string
          family_id: string
          id: string
          image_path: string
          last_error: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          image_path: string
          last_error?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          image_path?: string
          last_error?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_ocr_jobs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_ocr_quota: {
        Row: {
          family_id: string
          month: string
          used: number
        }
        Insert: {
          family_id: string
          month: string
          used?: number
        }
        Update: {
          family_id?: string
          month?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_ocr_quota_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_ocr_results: {
        Row: {
          category: string | null
          confidence: number | null
          created_at: string
          expense_id: string | null
          family_id: string
          job_id: string
          line_items: Json | null
          merchant: string | null
          raw: Json | null
          scanned_date: string | null
          total: number | null
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          created_at?: string
          expense_id?: string | null
          family_id: string
          job_id: string
          line_items?: Json | null
          merchant?: string | null
          raw?: Json | null
          scanned_date?: string | null
          total?: number | null
        }
        Update: {
          category?: string | null
          confidence?: number | null
          created_at?: string
          expense_id?: string | null
          family_id?: string
          job_id?: string
          line_items?: Json | null
          merchant?: string | null
          raw?: Json | null
          scanned_date?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_ocr_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "receipt_ocr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_scans: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          expense_id: string | null
          family_id: string
          id: string
          image_path: string | null
          merchant: string | null
          raw: Json | null
          scanned_date: string | null
          total: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          expense_id?: string | null
          family_id: string
          id?: string
          image_path?: string | null
          merchant?: string | null
          raw?: Json | null
          scanned_date?: string | null
          total?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          expense_id?: string | null
          family_id?: string
          id?: string
          image_path?: string | null
          merchant?: string | null
          raw?: Json | null
          scanned_date?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_scans_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_scans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      request_traces: {
        Row: {
          attrs: Json
          created_at: string
          duration_ms: number
          id: string
          parent_id: string | null
          request_id: string
          span_name: string
          status: string
          user_id: string | null
        }
        Insert: {
          attrs?: Json
          created_at?: string
          duration_ms: number
          id?: string
          parent_id?: string | null
          request_id: string
          span_name: string
          status?: string
          user_id?: string | null
        }
        Update: {
          attrs?: Json
          created_at?: string
          duration_ms?: number
          id?: string
          parent_id?: string | null
          request_id?: string
          span_name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      safe_checks: {
        Row: {
          checked_at: string
          checked_by: string
          elderly_id: string
          family_id: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          checked_at?: string
          checked_by: string
          elderly_id: string
          family_id: string
          id?: string
          note?: string | null
          status?: string
        }
        Update: {
          checked_at?: string
          checked_by?: string
          elderly_id?: string
          family_id?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "safe_checks_elderly_id_fkey"
            columns: ["elderly_id"]
            isOneToOne: false
            referencedRelation: "elderly_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_schedules: {
        Row: {
          child_id: string
          created_at: string
          created_by: string
          day_of_week: number
          family_id: string
          id: string
          room: string | null
          subject: string
          time_end: string | null
          time_start: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by: string
          day_of_week: number
          family_id: string
          id?: string
          room?: string | null
          subject: string
          time_end?: string | null
          time_start?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string
          day_of_week?: number
          family_id?: string
          id?: string
          room?: string | null
          subject?: string
          time_end?: string | null
          time_start?: string | null
        }
        Relationships: []
      }
      security_requests: {
        Row: {
          apartment: string | null
          apartment_id: string | null
          assigned_to: string | null
          block_id: string | null
          building: string | null
          created_at: string
          family_id: string | null
          id: string
          payload: Json | null
          project_id: string | null
          request_type: string
          requester_id: string | null
          resolved_at: string | null
          scope_source: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          apartment?: string | null
          apartment_id?: string | null
          assigned_to?: string | null
          block_id?: string | null
          building?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          payload?: Json | null
          project_id?: string | null
          request_type: string
          requester_id?: string | null
          resolved_at?: string | null
          scope_source?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          apartment?: string | null
          apartment_id?: string | null
          assigned_to?: string | null
          block_id?: string | null
          building?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          payload?: Json | null
          project_id?: string | null
          request_type?: string
          requester_id?: string | null
          resolved_at?: string | null
          scope_source?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_requests_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_requests_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          apartment_id: string | null
          assigned_to: string | null
          contact_phone: string | null
          created_at: string
          family_id: string | null
          id: string
          notes: string | null
          project_id: string | null
          requested_by: string
          resolved_at: string | null
          scheduled_at: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          apartment_id?: string | null
          assigned_to?: string | null
          contact_phone?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          requested_by: string
          resolved_at?: string | null
          scheduled_at?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          apartment_id?: string | null
          assigned_to?: string | null
          contact_phone?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          requested_by?: string
          resolved_at?: string | null
          scheduled_at?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "community_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          apartment_id: string | null
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          priority: string
          project_id: string
          requester_id: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          apartment_id?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          priority?: string
          project_id: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          apartment_id?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          priority?: string
          project_id?: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          family_id: string
          id: string
          name: string
          purchased: boolean
          qty: number | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          name: string
          purchased?: boolean
          qty?: number | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          name?: string
          purchased?: boolean
          qty?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      sos_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          note: string | null
          request_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          request_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          request_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "security_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          context: Json
          created_at: string
          id: string
          message: string
          severity: string
          source: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          context?: Json
          created_at?: string
          id?: string
          message: string
          severity: string
          source: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          context?: Json
          created_at?: string
          id?: string
          message?: string
          severity?: string
          source?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          plan: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          plan?: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          plan?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          family_id: string | null
          id: string
          project_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id?: string | null
          id?: string
          project_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string | null
          id?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_passes: {
        Row: {
          apartment_id: string | null
          created_at: string
          family_id: string | null
          guest_name: string
          guest_phone: string | null
          host_user_id: string
          id: string
          pass_code: string
          project_id: string | null
          purpose: string | null
          scanned_at: string | null
          scanned_by: string | null
          status: string
          updated_at: string
          valid_from: string
          valid_until: string
          vehicle_plate: string | null
        }
        Insert: {
          apartment_id?: string | null
          created_at?: string
          family_id?: string | null
          guest_name: string
          guest_phone?: string | null
          host_user_id: string
          id?: string
          pass_code?: string
          project_id?: string | null
          purpose?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until: string
          vehicle_plate?: string | null
        }
        Update: {
          apartment_id?: string | null
          created_at?: string
          family_id?: string | null
          guest_name?: string
          guest_phone?: string | null
          host_user_id?: string
          id?: string
          pass_code?: string
          project_id?: string | null
          purpose?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_passes_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      metrics_hourly: {
        Row: {
          app: string | null
          hour: string | null
          level: string | null
          log_count: number | null
        }
        Relationships: []
      }
      mv_ops_kpi_daily: {
        Row: {
          avg_resolve_hours: number | null
          category: string | null
          day: string | null
          in_progress_count: number | null
          open_count: number | null
          project_id: string | null
          resolved_count: number | null
          total_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      acknowledge_sos: {
        Args: { _event_id: string; _notes?: string }
        Returns: undefined
      }
      activate_premium_trial: {
        Args: { _family_id: string }
        Returns: {
          expires_at: string | null
          family_id: string
          insights_enabled: boolean
          ocr_monthly_quota: number
          plan: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_entitlement: {
        Args: {
          _days?: number
          _family_id: string
          _insights?: boolean
          _ocr_quota?: number
          _plan: string
        }
        Returns: {
          expires_at: string | null
          family_id: string
          insights_enabled: boolean
          ocr_monthly_quota: number
          plan: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_expense_budget_alerts: {
        Args: { _family_id: string }
        Returns: number
      }
      check_expense_recurring_due: {
        Args: { _family_id: string }
        Returns: number
      }
      check_health_alerts: { Args: never; Returns: undefined }
      cleanup_old_app_logs: { Args: never; Returns: number }
      detect_expense_anomalies: {
        Args: { p_family_id: string }
        Returns: number
      }
      enqueue_ocr_job: {
        Args: { _family_id: string; _image_path: string }
        Returns: string
      }
      get_health_profiles: {
        Args: { _family_id: string }
        Returns: {
          allergies: string
          blood_type: string
          conditions: string
          created_at: string
          dob: string
          emergency_unlocked: boolean
          family_id: string
          id: string
          member_id: string
          name: string
          notes: string
          updated_at: string
        }[]
      }
      get_ocr_entitlement: {
        Args: { _family_id: string }
        Returns: {
          insights_enabled: boolean
          plan: string
          quota: number
          remaining: number
          used: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_bql_for_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_bql_manager_of_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_bql_of_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_owner: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_resident_of_apartment: {
        Args: { _apartment_id: string; _user_id: string }
        Returns: boolean
      }
      is_resident_of_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_saas_admin: { Args: { _user_id: string }; Returns: boolean }
      is_security_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      list_all_guard_shifts: {
        Args: { _from: string; _to: string }
        Returns: {
          end_at: string
          guard_avatar: string
          guard_id: string
          guard_name: string
          project_code: string
          project_id: string
          project_name: string
          shift_date: string
          shift_id: string
          shift_type: string
          start_at: string
          status: string
        }[]
      }
      list_all_guards: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          guard_id: string
          next_shift_at: string
          on_shift_today: boolean
          phone: string
          project_code: string
          project_id: string
          project_name: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          tenant_name: string
        }[]
      }
      list_project_guard_shifts: {
        Args: { _from: string; _project_id: string; _to: string }
        Returns: {
          end_at: string
          guard_avatar: string
          guard_id: string
          guard_name: string
          shift_date: string
          shift_id: string
          shift_type: string
          start_at: string
          status: string
        }[]
      }
      list_project_guards: {
        Args: { _project_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          guard_id: string
          next_shift_at: string
          on_shift_today: boolean
          phone: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      list_saas_families: {
        Args: { _plan?: string; _project_id?: string; _tenant_id?: string }
        Returns: {
          apartment_code: string
          apartment_id: string
          created_at: string
          expires_at: string
          family_apartment: string
          family_id: string
          family_name: string
          insights_enabled: boolean
          member_count: number
          ocr_monthly_quota: number
          owner_email: string
          owner_id: string
          owner_name: string
          plan: string
          project_code: string
          project_id: string
          project_name: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      list_saas_security_requests: {
        Args: {
          _from?: string
          _project_id?: string
          _status?: string
          _tenant_id?: string
          _to?: string
        }
        Returns: {
          apartment: string
          assigned_to: string
          assignee_name: string
          building: string
          created_at: string
          id: string
          project_code: string
          project_id: string
          project_name: string
          request_type: string
          requester_id: string
          requester_name: string
          resolution_minutes: number
          resolved_at: string
          status: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      log_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id: string
          _target_table: string
        }
        Returns: undefined
      }
      refresh_metrics_views: { Args: never; Returns: undefined }
      refresh_ops_kpi_daily: { Args: never; Returns: undefined }
      resolve_login_email: { Args: { _username: string }; Returns: string }
      resolve_sos: {
        Args: { _cancelled?: boolean; _event_id: string; _notes?: string }
        Returns: undefined
      }
      resolve_user_primary_apartment: {
        Args: { _user_id: string }
        Returns: {
          apartment_id: string
          block_id: string
          family_id: string
          project_id: string
          tenant_id: string
        }[]
      }
      run_sos_load_test: {
        Args: {
          _guard?: string
          _household_id?: string
          _n?: number
          _triggerer?: string
        }
        Returns: {
          metric: string
          value_ms: number
        }[]
      }
      saas_families_summary: {
        Args: { _project_id?: string; _tenant_id?: string }
        Returns: {
          expiring_soon: number
          free_count: number
          premium_count: number
          projects_covered: number
          tenants_covered: number
          total_families: number
        }[]
      }
      saas_observability_ack_alert: {
        Args: { _alert_id: string }
        Returns: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          context: Json
          created_at: string
          id: string
          message: string
          severity: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "system_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      saas_observability_recent_alerts: {
        Args: { _limit?: number }
        Returns: {
          acknowledged: boolean
          acknowledged_at: string
          acknowledged_by: string
          context: Json
          created_at: string
          id: string
          message: string
          severity: string
          source: string
        }[]
      }
      saas_observability_recent_audit: {
        Args: { _limit?: number }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          id: string
          metadata: Json
          target_id: string
          target_table: string
        }[]
      }
      saas_observability_recent_errors: {
        Args: { _limit?: number }
        Returns: {
          app: string
          context: Json
          id: number
          level: string
          message: string
          request_id: string
          ts: string
          user_id: string
          user_name: string
        }[]
      }
      saas_observability_summary: { Args: never; Returns: Json }
      saas_observability_timeseries: {
        Args: { _hours?: number }
        Returns: {
          app: string
          hour: string
          level: string
          log_count: number
        }[]
      }
      saas_security_ops_summary: {
        Args: {
          _from?: string
          _project_id?: string
          _tenant_id?: string
          _to?: string
        }
        Returns: {
          ack_sla_minutes: number
          cancelled_count: number
          in_progress_count: number
          mttr_minutes: number
          open_count: number
          projects_covered: number
          resolved_count: number
          tenants_covered: number
          total: number
        }[]
      }
      tick_expense_recurring: { Args: never; Returns: number }
      tick_reminder_notifications: { Args: never; Returns: number }
      trigger_sos: {
        Args: {
          _device_info?: Json
          _household_id: string
          _location?: Json
          _notes?: string
          _severity?: "low" | "normal" | "high" | "critical"
          _trigger_kind?: "button" | "fall" | "noise" | "manual" | "other"
        }
        Returns: string
      }
      upsert_health_profile_enc: {
        Args: {
          _allergies: string
          _blood_type: string
          _conditions: string
          _dob: string
          _family_id: string
          _id: string
          _name: string
          _notes: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "family_owner"
        | "family_member"
        | "security_admin"
        | "security_staff"
        | "saas_admin"
        | "saas_support"
        | "tenant_admin"
        | "bql_manager"
        | "bql_staff"
        | "technician"
        | "accountant"
      fee_status: "unpaid" | "partial" | "paid" | "overdue" | "waived"
      fee_type:
        | "management"
        | "parking"
        | "electricity"
        | "water"
        | "internet"
        | "other"
      payment_method: "cash" | "bank_transfer" | "vietqr" | "card" | "wallet"
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
      app_role: [
        "super_admin",
        "family_owner",
        "family_member",
        "security_admin",
        "security_staff",
        "saas_admin",
        "saas_support",
        "tenant_admin",
        "bql_manager",
        "bql_staff",
        "technician",
        "accountant",
      ],
      fee_status: ["unpaid", "partial", "paid", "overdue", "waived"],
      fee_type: [
        "management",
        "parking",
        "electricity",
        "water",
        "internet",
        "other",
      ],
      payment_method: ["cash", "bank_transfer", "vietqr", "card", "wallet"],
    },
  },
} as const
