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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ahsp: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          division: string
          id: string
          organization_id: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          division: string
          id?: string
          organization_id: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          division?: string
          id?: string
          organization_id?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ahsp_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ahsp_org_unit_fkey"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "ahsp_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ahsp_components: {
        Row: {
          ahsp_id: string
          coefficient: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          organization_id: string
          price_item_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          ahsp_id: string
          coefficient: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id: string
          price_item_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ahsp_id?: string
          coefficient?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id?: string
          price_item_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ahsp_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ahsp_components_org_ahsp_fkey"
            columns: ["organization_id", "ahsp_id"]
            isOneToOne: false
            referencedRelation: "ahsp"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "ahsp_components_org_price_item_fkey"
            columns: ["organization_id", "price_item_id"]
            isOneToOne: false
            referencedRelation: "price_items"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "ahsp_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ahsp_resources: {
        Row: {
          category: string
          code: string
          id: string
          name: string
          organization_id: string
          source: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          id?: string
          name: string
          organization_id: string
          source?: string | null
          unit: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          id?: string
          name?: string
          organization_id?: string
          source?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ahsp_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ahsp_templates: {
        Row: {
          code: string
          components: Json
          created_at: string
          division: string
          id: string
          organization_id: string
          overhead_percent: number
          title: string
          unit: string
          unit_price: number
        }
        Insert: {
          code: string
          components?: Json
          created_at?: string
          division: string
          id?: string
          organization_id: string
          overhead_percent?: number
          title: string
          unit: string
          unit_price?: number
        }
        Update: {
          code?: string
          components?: Json
          created_at?: string
          division?: string
          id?: string
          organization_id?: string
          overhead_percent?: number
          title?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ahsp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          project_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          project_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          project_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_items: {
        Row: {
          ahsp_id: string | null
          boq_version_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          item_code: string
          item_type: string
          line_total: number | null
          organization_id: string
          parent_id: string | null
          project_id: string
          sort_order: number
          unit_id: string | null
          unit_price: number | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          ahsp_id?: string | null
          boq_version_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          item_code: string
          item_type: string
          line_total?: number | null
          organization_id: string
          parent_id?: string | null
          project_id: string
          sort_order?: number
          unit_id?: string | null
          unit_price?: number | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          ahsp_id?: string | null
          boq_version_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          item_code?: string
          item_type?: string
          line_total?: number | null
          organization_id?: string
          parent_id?: string | null
          project_id?: string
          sort_order?: number
          unit_id?: string | null
          unit_price?: number | null
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_org_ahsp_fkey"
            columns: ["organization_id", "ahsp_id"]
            isOneToOne: false
            referencedRelation: "ahsp"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "boq_items_org_unit_fkey"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "boq_items_org_version_fkey"
            columns: ["organization_id", "project_id", "boq_version_id"]
            isOneToOne: false
            referencedRelation: "boq_versions"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
          {
            foreignKeyName: "boq_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_parent_fkey"
            columns: [
              "organization_id",
              "project_id",
              "boq_version_id",
              "parent_id",
            ]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: [
              "organization_id",
              "project_id",
              "boq_version_id",
              "id",
            ]
          },
        ]
      }
      boq_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          grand_total: number
          id: string
          organization_id: string
          overhead_amount: number
          overhead_percent: number
          ppn_amount: number
          ppn_percent: number
          profit_amount: number
          profit_percent: number
          project_id: string
          revision_number: number
          status: string
          subtotal_direct_cost: number
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          grand_total?: number
          id?: string
          organization_id: string
          overhead_amount?: number
          overhead_percent?: number
          ppn_amount?: number
          ppn_percent?: number
          profit_amount?: number
          profit_percent?: number
          project_id: string
          revision_number?: number
          status?: string
          subtotal_direct_cost?: number
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          grand_total?: number
          id?: string
          organization_id?: string
          overhead_amount?: number
          overhead_percent?: number
          ppn_amount?: number
          ppn_percent?: number
          profit_amount?: number
          profit_percent?: number
          project_id?: string
          revision_number?: number
          status?: string
          subtotal_direct_cost?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_versions_org_project_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "boq_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_equipment: {
        Row: {
          active_hours: number
          equipment_name: string
          id: string
          quantity: number
          remarks: string | null
          report_id: string
          standby_hours: number
        }
        Insert: {
          active_hours?: number
          equipment_name: string
          id?: string
          quantity?: number
          remarks?: string | null
          report_id: string
          standby_hours?: number
        }
        Update: {
          active_hours?: number
          equipment_name?: string
          id?: string
          quantity?: number
          remarks?: string | null
          report_id?: string
          standby_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_equipment_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_site_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_manpower: {
        Row: {
          headcount: number
          id: string
          report_id: string
          trade_type: string
          work_hours: number
        }
        Insert: {
          headcount?: number
          id?: string
          report_id: string
          trade_type: string
          work_hours?: number
        }
        Update: {
          headcount?: number
          id?: string
          report_id?: string
          trade_type?: string
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_manpower_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_site_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_materials: {
        Row: {
          delivery_note_no: string | null
          id: string
          material_name: string
          report_id: string
          supplier_name: string | null
          unit: string
          volume: number
        }
        Insert: {
          delivery_note_no?: string | null
          id?: string
          material_name: string
          report_id: string
          supplier_name?: string | null
          unit: string
          volume: number
        }
        Update: {
          delivery_note_no?: string | null
          id?: string
          material_name?: string
          report_id?: string
          supplier_name?: string | null
          unit?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_materials_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_site_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_photos: {
        Row: {
          caption: string
          created_at: string
          id: string
          photo_url: string
          report_id: string
          zone_location: string | null
        }
        Insert: {
          caption: string
          created_at?: string
          id?: string
          photo_url: string
          report_id: string
          zone_location?: string | null
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          photo_url?: string
          report_id?: string
          zone_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_site_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_site_reports: {
        Row: {
          created_at: string
          id: string
          inspector_name: string | null
          obstacles: string | null
          organization_id: string
          project_id: string
          report_date: string
          report_number: string
          signature_inspector: string | null
          signature_site_manager: string | null
          site_manager_name: string
          solutions: string | null
          status: string
          updated_at: string
          weather_afternoon: string
          weather_evening: string
          weather_morning: string
          work_description: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspector_name?: string | null
          obstacles?: string | null
          organization_id: string
          project_id: string
          report_date: string
          report_number: string
          signature_inspector?: string | null
          signature_site_manager?: string | null
          site_manager_name: string
          solutions?: string | null
          status?: string
          updated_at?: string
          weather_afternoon?: string
          weather_evening?: string
          weather_morning?: string
          work_description: string
        }
        Update: {
          created_at?: string
          id?: string
          inspector_name?: string | null
          obstacles?: string | null
          organization_id?: string
          project_id?: string
          report_date?: string
          report_number?: string
          signature_inspector?: string | null
          signature_site_manager?: string | null
          site_manager_name?: string
          solutions?: string | null
          status?: string
          updated_at?: string
          weather_afternoon?: string
          weather_evening?: string
          weather_morning?: string
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_site_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_site_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_number_sequences: {
        Row: {
          entity_type: string
          id: string
          last_value: number
          organization_id: string
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          entity_type: string
          id?: string
          last_value?: number
          organization_id: string
          prefix?: string
          updated_at?: string
          year: number
        }
        Update: {
          entity_type?: string
          id?: string
          last_value?: number
          organization_id?: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "doc_number_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          organization_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          department: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          job_title: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          department?: string | null
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_by: string
          job_title?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          job_title?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          job_title: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          job_title?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          job_title?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_name: string | null
          city: string | null
          company_code: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          letterhead_url: string | null
          logo_url: string | null
          name: string
          nib: string | null
          npwp: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          city?: string | null
          company_code?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          letterhead_url?: string | null
          logo_url?: string | null
          name: string
          nib?: string | null
          npwp?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          city?: string | null
          company_code?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          letterhead_url?: string | null
          logo_url?: string | null
          name?: string
          nib?: string | null
          npwp?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_members: number
          max_projects: number
          max_storage_gb: number
          name: string
          price_idr: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id: string
          is_active?: boolean
          max_members?: number
          max_projects?: number
          max_storage_gb?: number
          name: string
          price_idr: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number
          max_projects?: number
          max_storage_gb?: number
          name?: string
          price_idr?: number
        }
        Relationships: []
      }
      price_items: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          region: string | null
          source: string | null
          unit_id: string
          unit_price: number
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          region?: string | null
          source?: string | null
          unit_id: string
          unit_price: number
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          region?: string | null
          source?: string | null
          unit_id?: string
          unit_price?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_items_org_unit_fkey"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "price_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_addendums: {
        Row: {
          addendum_number: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          project_id: string
          time_extension_days: number
          title: string
        }
        Insert: {
          addendum_number: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          project_id: string
          time_extension_days?: number
          title: string
        }
        Update: {
          addendum_number?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          time_extension_days?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_addendums_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_addendums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_addendums_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_addendums_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_boq_items: {
        Row: {
          boq_id: string
          created_at: string
          description: string
          division_code: string
          division_name: string
          id: string
          installed_percent: number
          installed_volume: number
          item_code: string
          organization_id: string
          project_id: string
          total_price: number
          unit: string
          unit_price: number
          volume: number
          weight_percent: number
        }
        Insert: {
          boq_id: string
          created_at?: string
          description: string
          division_code: string
          division_name: string
          id?: string
          installed_percent?: number
          installed_volume?: number
          item_code: string
          organization_id: string
          project_id: string
          total_price?: number
          unit: string
          unit_price?: number
          volume?: number
          weight_percent?: number
        }
        Update: {
          boq_id?: string
          created_at?: string
          description?: string
          division_code?: string
          division_name?: string
          id?: string
          installed_percent?: number
          installed_volume?: number
          item_code?: string
          organization_id?: string
          project_id?: string
          total_price?: number
          unit?: string
          unit_price?: number
          volume?: number
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_boq_items_boq_id_fkey"
            columns: ["boq_id"]
            isOneToOne: false
            referencedRelation: "project_boqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boq_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_boqs: {
        Row: {
          created_at: string
          grand_total: number
          id: string
          is_approved: boolean
          organization_id: string
          overhead_amount: number
          overhead_percent: number
          ppn_amount: number
          ppn_percent: number
          project_id: string
          subtotal_direct_cost: number
          title: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          grand_total?: number
          id?: string
          is_approved?: boolean
          organization_id: string
          overhead_amount?: number
          overhead_percent?: number
          ppn_amount?: number
          ppn_percent?: number
          project_id: string
          subtotal_direct_cost?: number
          title?: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          grand_total?: number
          id?: string
          is_approved?: boolean
          organization_id?: string
          overhead_amount?: number
          overhead_percent?: number
          ppn_amount?: number
          ppn_percent?: number
          project_id?: string
          subtotal_direct_cost?: number
          title?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_boqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          project_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          project_id: string
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_progress: number
          category: string
          client_contact: string | null
          client_name: string
          code: string
          contract_number: string | null
          contract_value: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_date: string
          id: string
          latitude: number | null
          location_address: string
          location_city: string
          location_province: string
          longitude: number | null
          maintenance_days: number
          name: string
          notes: string | null
          organization_id: string
          planned_progress: number
          project_manager_id: string | null
          realized_cost: number
          retention_percent: number
          site_manager_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["project_status_type"]
          updated_at: string
        }
        Insert: {
          actual_progress?: number
          category?: string
          client_contact?: string | null
          client_name: string
          code: string
          contract_number?: string | null
          contract_value?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date: string
          id?: string
          latitude?: number | null
          location_address: string
          location_city: string
          location_province: string
          longitude?: number | null
          maintenance_days?: number
          name: string
          notes?: string | null
          organization_id: string
          planned_progress?: number
          project_manager_id?: string | null
          realized_cost?: number
          retention_percent?: number
          site_manager_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["project_status_type"]
          updated_at?: string
        }
        Update: {
          actual_progress?: number
          category?: string
          client_contact?: string | null
          client_name?: string
          code?: string
          contract_number?: string | null
          contract_value?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string
          id?: string
          latitude?: number | null
          location_address?: string
          location_city?: string
          location_province?: string
          longitude?: number | null
          maintenance_days?: number
          name?: string
          notes?: string | null
          organization_id?: string
          planned_progress?: number
          project_manager_id?: string | null
          realized_cost?: number
          retention_percent?: number
          site_manager_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["project_status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_site_manager_id_fkey"
            columns: ["site_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          module: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          module: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          module?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_progress_curves: {
        Row: {
          actual_cumulative_percent: number | null
          actual_weekly_percent: number | null
          created_at: string
          deviation_percent: number | null
          end_date: string
          id: string
          organization_id: string
          planned_cumulative_percent: number
          planned_weekly_percent: number
          project_id: string
          start_date: string
          week_label: string
          week_number: number
        }
        Insert: {
          actual_cumulative_percent?: number | null
          actual_weekly_percent?: number | null
          created_at?: string
          deviation_percent?: number | null
          end_date: string
          id?: string
          organization_id: string
          planned_cumulative_percent?: number
          planned_weekly_percent?: number
          project_id: string
          start_date: string
          week_label: string
          week_number: number
        }
        Update: {
          actual_cumulative_percent?: number | null
          actual_weekly_percent?: number | null
          created_at?: string
          deviation_percent?: number | null
          end_date?: string
          id?: string
          organization_id?: string
          planned_cumulative_percent?: number
          planned_weekly_percent?: number
          project_id?: string
          start_date?: string
          week_label?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_progress_curves_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_progress_curves_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { p_email: string; p_invitation_id: string; p_user_id: string }
        Returns: {
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          job_title: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization_invitation: {
        Args: {
          p_department: string
          p_email: string
          p_full_name: string
          p_invited_by: string
          p_job_title: string
          p_organization_id: string
          p_role: Database["public"]["Enums"]["user_role_type"]
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          department: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          job_title: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization_with_owner: {
        Args: { org_data?: Json }
        Returns: {
          address: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_name: string | null
          city: string | null
          company_code: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          letterhead_url: string | null
          logo_url: string | null
          name: string
          nib: string | null
          npwp: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_org_ids: { Args: never; Returns: string[] }
      current_user_role: {
        Args: { target_org_id: string }
        Returns: Database["public"]["Enums"]["user_role_type"]
      }
      generate_document_number: {
        Args: {
          p_entity_type: string
          p_organization_id: string
          p_prefix?: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["user_role_type"][]
          target_org_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
      manage_organization_member_access: {
        Args: {
          p_is_active: boolean
          p_member_id: string
          p_role: Database["public"]["Enums"]["user_role_type"]
        }
        Returns: {
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          job_title: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_organization_invitation_delivery_failed: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      project_status_type:
        | "planning"
        | "active"
        | "delayed"
        | "completed"
        | "maintenance"
      subscription_status_type:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      user_role_type:
        | "owner"
        | "admin"
        | "project_manager"
        | "site_manager"
        | "estimator"
        | "procurement"
        | "finance"
        | "warehouse"
        | "safety_officer"
        | "subcontractor"
        | "client_viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      project_status_type: [
        "planning",
        "active",
        "delayed",
        "completed",
        "maintenance",
      ],
      subscription_status_type: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      user_role_type: [
        "owner",
        "admin",
        "project_manager",
        "site_manager",
        "estimator",
        "procurement",
        "finance",
        "warehouse",
        "safety_officer",
        "subcontractor",
        "client_viewer",
      ],
    },
  },
} as const
