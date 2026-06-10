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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          family_id: string
          id: string
          note: string | null
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
          note?: string | null
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
          note?: string | null
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
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          apartment?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          apartment?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
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
      health_profiles: {
        Row: {
          allergies: string | null
          blood_type: string | null
          conditions: string | null
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
          allergies?: string | null
          blood_type?: string | null
          conditions?: string | null
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
          allergies?: string | null
          blood_type?: string | null
          conditions?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
          assigned_to: string | null
          building: string | null
          created_at: string
          id: string
          payload: Json | null
          request_type: string
          requester_id: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          apartment?: string | null
          assigned_to?: string | null
          building?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          request_type: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          apartment?: string | null
          assigned_to?: string | null
          building?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          request_type?: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
      log_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id: string
          _target_table: string
        }
        Returns: undefined
      }
      tick_reminder_notifications: { Args: never; Returns: number }
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
    },
  },
} as const
