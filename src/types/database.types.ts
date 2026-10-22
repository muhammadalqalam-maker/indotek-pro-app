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
      approval_delegations: {
        Row: {
          approval_step_id: string
          created_at: string
          created_by: string | null
          delegate_user_id: string
          deleted_at: string | null
          expires_at: string
          id: string
          organization_id: string
          project_id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          approval_step_id: string
          created_at?: string
          created_by?: string | null
          delegate_user_id: string
          deleted_at?: string | null
          expires_at: string
          id?: string
          organization_id: string
          project_id: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_step_id?: string
          created_at?: string
          created_by?: string | null
          delegate_user_id?: string
          deleted_at?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_delegations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_delegate_user_id_fkey"
            columns: ["delegate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_organization_id_approval_step_id_fkey"
            columns: ["organization_id", "approval_step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "approval_delegations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_flow_steps: {
        Row: {
          approval_flow_id: string
          approver_roles: Database["public"]["Enums"]["user_role_type"][]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          organization_id: string
          step_number: number
          updated_at: string
        }
        Insert: {
          approval_flow_id: string
          approver_roles: Database["public"]["Enums"]["user_role_type"][]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id: string
          step_number: number
          updated_at?: string
        }
        Update: {
          approval_flow_id?: string
          approver_roles?: Database["public"]["Enums"]["user_role_type"][]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_flow_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_flow_steps_organization_id_approval_flow_id_fkey"
            columns: ["organization_id", "approval_flow_id"]
            isOneToOne: false
            referencedRelation: "approval_flows"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "approval_flow_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_flows: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          resource_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          resource_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          resource_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number
          approval_flow_id: string
          created_at: string
          created_by: string | null
          current_step: number
          deleted_at: string | null
          id: string
          organization_id: string
          project_id: string
          reference_number: string
          requester_comment: string
          requester_id: string
          resource_id: string
          resource_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approval_flow_id: string
          created_at?: string
          created_by?: string | null
          current_step?: number
          deleted_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          reference_number: string
          requester_comment?: string
          requester_id: string
          resource_id: string
          resource_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_flow_id?: string
          created_at?: string
          created_by?: string | null
          current_step?: number
          deleted_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          reference_number?: string
          requester_comment?: string
          requester_id?: string
          resource_id?: string
          resource_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_approval_flow_id_fkey"
            columns: ["organization_id", "approval_flow_id"]
            isOneToOne: false
            referencedRelation: "approval_flows"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_project_id_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          approval_request_id: string
          approver_roles: Database["public"]["Enums"]["user_role_type"][]
          comment: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          organization_id: string
          project_id: string
          status: string
          step_number: number
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          approval_request_id: string
          approver_roles: Database["public"]["Enums"]["user_role_type"][]
          comment?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          status?: string
          step_number: number
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          approval_request_id?: string
          approver_roles?: Database["public"]["Enums"]["user_role_type"][]
          comment?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          status?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_acted_by_fkey"
            columns: ["acted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_organization_id_approval_request_id_fkey"
            columns: ["organization_id", "approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "approval_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_project_id_fkey"
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
      daily_report_equipment_entries: {
        Row: {
          active_hours: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          equipment_name: string
          id: string
          organization_id: string
          project_id: string
          quantity: number
          remarks: string
          report_id: string
          standby_hours: number
          updated_at: string
        }
        Insert: {
          active_hours?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          equipment_name: string
          id?: string
          organization_id: string
          project_id: string
          quantity?: number
          remarks?: string
          report_id: string
          standby_hours?: number
          updated_at?: string
        }
        Update: {
          active_hours?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          equipment_name?: string
          id?: string
          organization_id?: string
          project_id?: string
          quantity?: number
          remarks?: string
          report_id?: string
          standby_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_equipment_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_equipment_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_equipment_entries_report_fkey"
            columns: ["organization_id", "project_id", "report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["organization_id", "project_id", "id"]
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
      daily_report_manpower_entries: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          headcount: number
          id: string
          organization_id: string
          project_id: string
          remarks: string
          report_id: string
          trade_type: string
          updated_at: string
          work_hours: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          headcount?: number
          id?: string
          organization_id: string
          project_id: string
          remarks?: string
          report_id: string
          trade_type: string
          updated_at?: string
          work_hours?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          headcount?: number
          id?: string
          organization_id?: string
          project_id?: string
          remarks?: string
          report_id?: string
          trade_type?: string
          updated_at?: string
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_manpower_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_manpower_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_manpower_entries_report_fkey"
            columns: ["organization_id", "project_id", "report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
        ]
      }
      daily_report_material_entries: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_note_no: string
          id: string
          material_name: string
          organization_id: string
          project_id: string
          quantity: number
          report_id: string
          supplier_name: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_note_no?: string
          id?: string
          material_name: string
          organization_id: string
          project_id: string
          quantity: number
          report_id: string
          supplier_name?: string
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_note_no?: string
          id?: string
          material_name?: string
          organization_id?: string
          project_id?: string
          quantity?: number
          report_id?: string
          supplier_name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_material_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_material_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_material_entries_report_fkey"
            columns: ["organization_id", "project_id", "report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["organization_id", "project_id", "id"]
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
      daily_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_signature_path: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          obstacles: string
          organization_id: string
          photo_paths: Json
          project_id: string
          report_date: string
          site_manager_name: string
          site_manager_signature_path: string | null
          solutions: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          weather_conditions: string
          work_summary: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_signature_path?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          obstacles?: string
          organization_id: string
          photo_paths?: Json
          project_id: string
          report_date: string
          site_manager_name?: string
          site_manager_signature_path?: string | null
          solutions?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          weather_conditions?: string
          work_summary?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_signature_path?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          obstacles?: string
          organization_id?: string
          photo_paths?: Json
          project_id?: string
          report_date?: string
          site_manager_name?: string
          site_manager_signature_path?: string | null
          solutions?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          weather_conditions?: string
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_org_project_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "daily_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      goods_receipt_items: {
        Row: {
          accepted_quantity: number
          condition_notes: string
          created_at: string
          created_by: string
          deleted_at: string | null
          goods_receipt_id: string
          id: string
          item_name: string
          organization_id: string
          po_quantity: number
          purchase_order_item_id: string
          received_quantity: number
          rejected_quantity: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          accepted_quantity: number
          condition_notes?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          goods_receipt_id: string
          id?: string
          item_name: string
          organization_id: string
          po_quantity: number
          purchase_order_item_id: string
          received_quantity: number
          rejected_quantity?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          accepted_quantity?: number
          condition_notes?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          goods_receipt_id?: string
          id?: string
          item_name?: string
          organization_id?: string
          po_quantity?: number
          purchase_order_item_id?: string
          received_quantity?: number
          rejected_quantity?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_organization_id_goods_receipt_id_fkey"
            columns: ["organization_id", "goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "goods_receipt_items_organization_id_purchase_order_item_id_fkey"
            columns: ["organization_id", "purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          delivery_note_number: string
          driver_name: string
          grn_number: string
          id: string
          notes: string
          organization_id: string
          project_id: string
          purchase_order_id: string
          received_date: string
          receiving_location: string | null
          receiver_name: string
          status: string
          updated_at: string
          vehicle_number: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_note_number: string
          driver_name?: string
          grn_number: string
          id?: string
          notes?: string
          organization_id: string
          project_id: string
          purchase_order_id: string
          received_date: string
          receiving_location?: string | null
          receiver_name: string
          status?: string
          updated_at?: string
          vehicle_number?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_note_number?: string
          driver_name?: string
          grn_number?: string
          id?: string
          notes?: string
          organization_id?: string
          project_id?: string
          purchase_order_id?: string
          received_date?: string
          receiving_location?: string | null
          receiver_name?: string
          status?: string
          updated_at?: string
          vehicle_number?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_project_id_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_purchase_order_id_fkey"
            columns: ["organization_id", "purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_vendor_id_fkey"
            columns: ["organization_id", "vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          created_by: string
          current_stock: number
          deleted_at: string | null
          id: string
          item_code: string
          item_name: string
          last_movement_date: string | null
          location_name: string
          minimum_stock: number
          organization_id: string
          project_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string
          current_stock?: number
          deleted_at?: string | null
          id?: string
          item_code: string
          item_name: string
          last_movement_date?: string | null
          location_name: string
          minimum_stock?: number
          organization_id: string
          project_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          current_stock?: number
          deleted_at?: string | null
          id?: string
          item_code?: string
          item_name?: string
          last_movement_date?: string | null
          location_name?: string
          minimum_stock?: number
          organization_id?: string
          project_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_project_id_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          destination_inventory_item_id: string | null
          destination_project_id: string | null
          goods_receipt_item_id: string | null
          id: string
          movement_date: string
          movement_number: string
          movement_type: string
          notes: string
          organization_id: string
          quantity: number
          recipient_or_supplier: string
          reference_doc: string
          source_inventory_item_id: string | null
          source_project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          destination_inventory_item_id?: string | null
          destination_project_id?: string | null
          goods_receipt_item_id?: string | null
          id?: string
          movement_date?: string
          movement_number: string
          movement_type: string
          notes?: string
          organization_id: string
          quantity: number
          recipient_or_supplier?: string
          reference_doc?: string
          source_inventory_item_id?: string | null
          source_project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          destination_inventory_item_id?: string | null
          destination_project_id?: string | null
          goods_receipt_item_id?: string | null
          id?: string
          movement_date?: string
          movement_number?: string
          movement_type?: string
          notes?: string
          organization_id?: string
          quantity?: number
          recipient_or_supplier?: string
          reference_doc?: string
          source_inventory_item_id?: string | null
          source_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_source_inventory_item_id_fkey"
            columns: ["organization_id", "source_inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_destination_inventory_item_id_fkey"
            columns: ["organization_id", "destination_inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_source_project_id_fkey"
            columns: ["organization_id", "source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_destination_project_id_fkey"
            columns: ["organization_id", "destination_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_goods_receipt_item_id_fkey"
            columns: ["organization_id", "goods_receipt_item_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_items"
            referencedColumns: ["organization_id", "id"]
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
      progress_entries: {
        Row: {
          boq_item_id: string
          boq_version_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          installed_volume: number
          organization_id: string
          project_id: string
          remarks: string
          report_id: string
          updated_at: string
        }
        Insert: {
          boq_item_id: string
          boq_version_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          installed_volume: number
          organization_id: string
          project_id: string
          remarks?: string
          report_id: string
          updated_at?: string
        }
        Update: {
          boq_item_id?: string
          boq_version_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          installed_volume?: number
          organization_id?: string
          project_id?: string
          remarks?: string
          report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_boq_item_fkey"
            columns: [
              "organization_id",
              "project_id",
              "boq_version_id",
              "boq_item_id",
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
          {
            foreignKeyName: "progress_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_entries_report_fkey"
            columns: ["organization_id", "project_id", "report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
        ]
      }
      project_addendums: {
        Row: {
          addendum_number: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          organization_id: string
          project_id: string
          time_extension_days: number
          title: string
          updated_at: string
        }
        Insert: {
          addendum_number: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          project_id: string
          time_extension_days?: number
          title: string
          updated_at?: string
        }
        Update: {
          addendum_number?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          time_extension_days?: number
          title?: string
          updated_at?: string
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
      project_boq_expenses: {
        Row: {
          amount: number
          boq_item_id: string
          boq_version_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string
          expense_date: string
          id: string
          organization_id: string
          project_id: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          boq_item_id: string
          boq_version_id: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description: string
          expense_date: string
          id?: string
          organization_id: string
          project_id: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          boq_item_id?: string
          boq_version_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string
          expense_date?: string
          id?: string
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_boq_expenses_boq_item_fkey"
            columns: [
              "organization_id",
              "project_id",
              "boq_version_id",
              "boq_item_id",
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
          {
            foreignKeyName: "project_boq_expenses_boq_version_fkey"
            columns: ["organization_id", "project_id", "boq_version_id"]
            isOneToOne: false
            referencedRelation: "boq_versions"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
          {
            foreignKeyName: "project_boq_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boq_expenses_org_project_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "project_boq_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boq_expenses_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      purchase_order_items: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          item_code: string
          item_name: string
          organization_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          specification: string
          total_price: number | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          item_code?: string
          item_name: string
          organization_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          specification?: string
          total_price?: number | null
          unit: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          item_code?: string
          item_name?: string
          organization_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          specification?: string
          total_price?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_organization_id_purchase_order_id_fkey"
            columns: ["organization_id", "purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approval_notes: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          delivery_address: string
          delivery_deadline: string
          grand_total: number
          id: string
          order_date: string
          organization_id: string
          po_number: string
          ppn_amount: number
          ppn_percent: number
          project_id: string
          purchase_request_id: string
          status: string
          subtotal: number
          updated_at: string
          vendor_id: string
          vendor_quote_id: string
        }
        Insert: {
          approval_notes?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_address: string
          delivery_deadline: string
          grand_total: number
          id?: string
          order_date?: string
          organization_id: string
          po_number: string
          ppn_amount: number
          ppn_percent: number
          project_id: string
          purchase_request_id: string
          status: string
          subtotal: number
          updated_at?: string
          vendor_id: string
          vendor_quote_id: string
        }
        Update: {
          approval_notes?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_address?: string
          delivery_deadline?: string
          grand_total?: number
          id?: string
          order_date?: string
          organization_id?: string
          po_number?: string
          ppn_amount?: number
          ppn_percent?: number
          project_id?: string
          purchase_request_id?: string
          status?: string
          subtotal?: number
          updated_at?: string
          vendor_id?: string
          vendor_quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_project_id_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_purchase_request_id_fkey"
            columns: ["organization_id", "purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_vendor_id_fkey"
            columns: ["organization_id", "vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_vendor_quote_id_fkey"
            columns: ["organization_id", "vendor_quote_id"]
            isOneToOne: true
            referencedRelation: "vendor_quotes"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      purchase_request_items: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          estimated_price: number
          id: string
          item_name: string
          organization_id: string
          purchase_request_id: string
          quantity: number
          specification: string
          subtotal: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          estimated_price: number
          id?: string
          item_name: string
          organization_id: string
          purchase_request_id: string
          quantity: number
          specification?: string
          subtotal?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          estimated_price?: number
          id?: string
          item_name?: string
          organization_id?: string
          purchase_request_id?: string
          quantity?: number
          specification?: string
          subtotal?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_organization_id_purchase_request_id_fkey"
            columns: ["organization_id", "purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      material_requests: {
        Row: { id: string; organization_id: string; project_id: string; request_number: string; request_date: string; required_date: string; requester_id: string; location_name: string; purpose: string; status: string; created_by: string; created_at: string; updated_at: string; deleted_at: string | null }
        Insert: { id?: string; organization_id: string; project_id: string; request_number: string; request_date?: string; required_date: string; requester_id?: string; location_name: string; purpose: string; status?: string; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Update: { id?: string; organization_id?: string; project_id?: string; request_number?: string; request_date?: string; required_date?: string; requester_id?: string; location_name?: string; purpose?: string; status?: string; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Relationships: []
      }
      material_request_items: {
        Row: { id: string; organization_id: string; material_request_id: string; inventory_item_id: string; quantity: number; notes: string; created_by: string; created_at: string; updated_at: string; deleted_at: string | null }
        Insert: { id?: string; organization_id: string; material_request_id: string; inventory_item_id: string; quantity: number; notes?: string; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Update: { id?: string; organization_id?: string; material_request_id?: string; inventory_item_id?: string; quantity?: number; notes?: string; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Relationships: []
      }
      subcontractors: {
        Row: { id: string; organization_id: string; code: string; company_name: string; trade_specialty: string; pic_name: string; phone: string; email: string; address: string; npwp: string; bank_name: string; bank_account_no: string; bank_account_name: string; is_active: boolean; created_by: string; created_at: string; updated_at: string; deleted_at: string | null }
        Insert: { id?: string; organization_id: string; code: string; company_name: string; trade_specialty: string; pic_name: string; phone: string; email?: string; address?: string; npwp?: string; bank_name?: string; bank_account_no?: string; bank_account_name?: string; is_active?: boolean; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Update: { id?: string; organization_id?: string; code?: string; company_name?: string; trade_specialty?: string; pic_name?: string; phone?: string; email?: string; address?: string; npwp?: string; bank_name?: string; bank_account_no?: string; bank_account_name?: string; is_active?: boolean; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Relationships: []
      }
      subcontracts: {
        Row: { id: string; organization_id: string; project_id: string; subcontractor_id: string; spk_number: string; work_description: string; contract_date: string; start_date: string; end_date: string; contract_amount: number; retention_percent: number; status: string; notes: string; created_by: string; created_at: string; updated_at: string; deleted_at: string | null }
        Insert: { id?: string; organization_id: string; project_id: string; subcontractor_id: string; spk_number: string; work_description: string; contract_date: string; start_date: string; end_date: string; contract_amount: number; retention_percent?: number; status?: string; notes?: string; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Update: { id?: string; organization_id?: string; project_id?: string; subcontractor_id?: string; spk_number?: string; work_description?: string; contract_date?: string; start_date?: string; end_date?: string; contract_amount?: number; retention_percent?: number; status?: string; notes?: string; created_by?: string; created_at?: string; updated_at?: string; deleted_at?: string | null }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          department: string
          id: string
          organization_id: string
          pr_number: string
          project_id: string
          request_date: string
          requester_comment: string
          requester_id: string
          required_date: string
          status: string
          total_estimated_amount: number
          updated_at: string
          urgency: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department: string
          id?: string
          organization_id: string
          pr_number: string
          project_id: string
          request_date?: string
          requester_comment?: string
          requester_id?: string
          required_date: string
          status?: string
          total_estimated_amount?: number
          updated_at?: string
          urgency: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department?: string
          id?: string
          organization_id?: string
          pr_number?: string
          project_id?: string
          request_date?: string
          requester_comment?: string
          requester_id?: string
          required_date?: string
          status?: string
          total_estimated_amount?: number
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_organization_id_project_id_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "purchase_requests_requester_id_fkey"
            columns: ["requester_id"]
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
      task_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dependency_type: string
          id: string
          organization_id: string
          predecessor_task_id: string
          project_id: string
          successor_task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dependency_type?: string
          id?: string
          organization_id: string
          predecessor_task_id: string
          project_id: string
          successor_task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dependency_type?: string
          id?: string
          organization_id?: string
          predecessor_task_id?: string
          project_id?: string
          successor_task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_predecessor_fkey"
            columns: ["organization_id", "project_id", "predecessor_task_id"]
            isOneToOne: false
            referencedRelation: "wbs_tasks"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_successor_fkey"
            columns: ["organization_id", "project_id", "successor_task_id"]
            isOneToOne: false
            referencedRelation: "wbs_tasks"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
        ]
      }
      vendor_evaluations: {
        Row: {
          comment: string
          created_at: string
          created_by: string
          deleted_at: string | null
          delivery_score: number
          evaluated_by: string
          id: string
          organization_id: string
          overall_score: number | null
          price_score: number
          quality_score: number
          service_score: number
          transaction_reference: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_score: number
          evaluated_by?: string
          id?: string
          organization_id: string
          overall_score?: number | null
          price_score: number
          quality_score: number
          service_score: number
          transaction_reference: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_score?: number
          evaluated_by?: string
          id?: string
          organization_id?: string
          overall_score?: number | null
          price_score?: number
          quality_score?: number
          service_score?: number
          transaction_reference?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_evaluations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_evaluations_organization_id_vendor_id_fkey"
            columns: ["organization_id", "vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      vendor_quote_items: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          organization_id: string
          purchase_request_item_id: string
          quantity: number
          subtotal: number | null
          unit_price: number
          updated_at: string
          vendor_quote_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          purchase_request_item_id: string
          quantity: number
          subtotal?: number | null
          unit_price: number
          updated_at?: string
          vendor_quote_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          purchase_request_item_id?: string
          quantity?: number
          subtotal?: number | null
          unit_price?: number
          updated_at?: string
          vendor_quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quote_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_items_organization_id_purchase_request_item_i_fkey"
            columns: ["organization_id", "purchase_request_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_request_items"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vendor_quote_items_organization_id_vendor_quote_id_fkey"
            columns: ["organization_id", "vendor_quote_id"]
            isOneToOne: false
            referencedRelation: "vendor_quotes"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      vendor_quotes: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          grand_total: number
          id: string
          notes: string
          organization_id: string
          ppn_amount: number
          ppn_percent: number
          project_id: string
          purchase_request_id: string
          quote_date: string
          quote_number: string
          subtotal: number
          updated_at: string
          valid_until: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          grand_total: number
          id?: string
          notes?: string
          organization_id: string
          ppn_amount: number
          ppn_percent?: number
          project_id: string
          purchase_request_id: string
          quote_date: string
          quote_number: string
          subtotal: number
          updated_at?: string
          valid_until?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          grand_total?: number
          id?: string
          notes?: string
          organization_id?: string
          ppn_amount?: number
          ppn_percent?: number
          project_id?: string
          purchase_request_id?: string
          quote_date?: string
          quote_number?: string
          subtotal?: number
          updated_at?: string
          valid_until?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotes_organization_id_project_id_fkey"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vendor_quotes_organization_id_purchase_request_id_fkey"
            columns: ["organization_id", "purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "vendor_quotes_organization_id_vendor_id_fkey"
            columns: ["organization_id", "vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string
          category: string
          code: string
          contact_person: string
          created_at: string
          created_by: string
          deleted_at: string | null
          email: string
          evaluation_count: number
          id: string
          is_active: boolean
          name: string
          npwp: string
          organization_id: string
          payment_terms_days: number
          phone: string
          rating: number
          updated_at: string
        }
        Insert: {
          address?: string
          category: string
          code: string
          contact_person: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email?: string
          evaluation_count?: number
          id?: string
          is_active?: boolean
          name: string
          npwp?: string
          organization_id: string
          payment_terms_days?: number
          phone: string
          rating?: number
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string
          code?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email?: string
          evaluation_count?: number
          id?: string
          is_active?: boolean
          name?: string
          npwp?: string
          organization_id?: string
          payment_terms_days?: number
          phone?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          end_date: string
          id: string
          is_milestone: boolean
          organization_id: string
          parent_task_id: string | null
          project_id: string
          sort_order: number
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          end_date: string
          id?: string
          is_milestone?: boolean
          organization_id: string
          parent_task_id?: string | null
          project_id: string
          sort_order?: number
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          end_date?: string
          id?: string
          is_milestone?: boolean
          organization_id?: string
          parent_task_id?: string | null
          project_id?: string
          sort_order?: number
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbs_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_tasks_parent_fkey"
            columns: ["organization_id", "project_id", "parent_task_id"]
            isOneToOne: false
            referencedRelation: "wbs_tasks"
            referencedColumns: ["organization_id", "project_id", "id"]
          },
          {
            foreignKeyName: "wbs_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      approve_daily_report: {
        Args: {
          p_approver_signature_path: string
          p_organization_id: string
          p_project_id: string
          p_report_id: string
        }
        Returns: string
      }
      archive_wbs_task: {
        Args: {
          p_organization_id: string
          p_project_id: string
          p_task_id: string
        }
        Returns: undefined
      }
      create_boq_revision: {
        Args: {
          p_organization_id: string
          p_project_id: string
          p_source_version_id: string
        }
        Returns: string
      }
      create_default_approval_flows: {
        Args: { target_organization_id: string }
        Returns: undefined
      }
      create_goods_receipt: {
        Args: {
          p_delivery_note_number: string
          p_driver_name: string
          p_items: Json
          p_notes: string
          p_organization_id: string
          p_purchase_order_id: string
          p_received_date: string
          p_receiver_name: string
          p_vehicle_number: string
        }
        Returns: string
      }
      create_goods_receipt_at_location: {
        Args: {
          p_delivery_note_number: string
          p_driver_name: string
          p_items: Json
          p_notes: string
          p_organization_id: string
          p_purchase_order_id: string
          p_received_date: string
          p_receiving_location: string
          p_receiver_name: string
          p_vehicle_number: string
        }
        Returns: string
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
      create_procurement_approval_request: {
        Args: {
          p_amount: number
          p_organization_id: string
          p_project_id: string
          p_reference_number: string
          p_resource_id: string
          p_resource_type: string
          p_title: string
        }
        Returns: string
      }
      create_project_addendum_with_approval: {
        Args: {
          p_addendum_number: string
          p_amount: number
          p_comment?: string
          p_description: string
          p_organization_id: string
          p_project_id: string
          p_time_extension_days: number
          p_title: string
        }
        Returns: string
      }
      create_purchase_order_from_quote: {
        Args: {
          p_delivery_address: string
          p_delivery_deadline: string
          p_organization_id: string
          p_purchase_request_id: string
          p_vendor_quote_id: string
        }
        Returns: string
      }
      create_material_request: {
        Args: { p_organization_id: string; p_project_id: string; p_required_date: string; p_location_name: string; p_purpose: string; p_items: Json }
        Returns: string
      }
      create_purchase_request: {
        Args: {
          p_comment: string
          p_department: string
          p_items: Json
          p_organization_id: string
          p_project_id: string
          p_required_date: string
          p_urgency: string
        }
        Returns: string
      }
      create_vendor_quote: {
        Args: {
          p_items: Json
          p_notes?: string
          p_organization_id: string
          p_ppn_percent: number
          p_purchase_request_id: string
          p_quote_date: string
          p_valid_until: string
          p_vendor_id: string
        }
        Returns: string
      }
      current_org_ids: { Args: never; Returns: string[] }
      current_user_role: {
        Args: { target_org_id: string }
        Returns: Database["public"]["Enums"]["user_role_type"]
      }
      delegate_approval_step: {
        Args: {
          p_approval_step_id: string
          p_delegate_user_id: string
          p_expires_at: string
        }
        Returns: string
      }
      generate_document_number: {
        Args: {
          p_entity_type: string
          p_organization_id: string
          p_prefix?: string
        }
        Returns: string
      }
      register_inventory_item: {
        Args: {
          p_category: string
          p_item_code: string
          p_item_name: string
          p_location_name: string
          p_minimum_stock: number
          p_organization_id: string
          p_project_id: string
          p_unit: string
        }
        Returns: string
      }
      record_stock_movement: {
        Args: {
          p_destination_inventory_item_id: string | null
          p_movement_date: string
          p_movement_type: string
          p_notes: string
          p_organization_id: string
          p_quantity: number
          p_recipient_or_supplier: string
          p_reference_doc: string
          p_source_inventory_item_id: string | null
        }
        Returns: string
      }
      update_inventory_minimum: {
        Args: {
          p_inventory_item_id: string
          p_minimum_stock: number
          p_organization_id: string
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
      notify_approval_step: {
        Args: { p_message: string; p_request_id: string; p_step_number: number }
        Returns: undefined
      }
      process_approval_step: {
        Args: {
          p_approval_request_id: string
          p_approver_signature_path?: string
          p_comment: string
          p_decision: string
        }
        Returns: undefined
      }
      record_project_boq_expense: {
        Args: {
          p_amount: number
          p_boq_item_id: string
          p_boq_version_id: string
          p_description: string
          p_expense_date: string
          p_organization_id: string
          p_project_id: string
        }
        Returns: string
      }
      record_vendor_evaluation: {
        Args: {
          p_comment: string
          p_delivery_score: number
          p_organization_id: string
          p_price_score: number
          p_quality_score: number
          p_service_score: number
          p_transaction_reference: string
          p_vendor_id: string
        }
        Returns: {
          evaluation_count: number
          evaluation_id: string
          rating: number
        }[]
      }
      refresh_boq_version_totals: {
        Args: { target_version_id: string }
        Returns: undefined
      }
      request_boq_revision_approval: {
        Args: {
          p_boq_version_id: string
          p_comment?: string
          p_organization_id: string
          p_project_id: string
        }
        Returns: string
      }
      save_subcontractor: {
        Args: { p_organization_id: string; p_subcontractor_id: string | null; p_code: string; p_company_name: string; p_trade_specialty: string; p_pic_name: string; p_phone: string; p_email: string; p_address: string; p_npwp: string; p_bank_name: string; p_bank_account_no: string; p_bank_account_name: string }
        Returns: string
      }
      save_subcontract: {
        Args: { p_organization_id: string; p_subcontract_id: string | null; p_project_id: string; p_subcontractor_id: string; p_spk_number: string; p_work_description: string; p_contract_date: string; p_start_date: string; p_end_date: string; p_contract_amount: number; p_retention_percent: number; p_status: string; p_notes: string }
        Returns: string
      }
      save_approval_flow: {
        Args: {
          p_is_active: boolean
          p_name: string
          p_organization_id: string
          p_resource_type: string
          p_steps: Json
        }
        Returns: string
      }
      save_boq_draft: {
        Args: {
          p_boq_version_id: string
          p_items: Json
          p_organization_id: string
          p_overhead_percent: number
          p_ppn_percent: number
          p_profit_percent: number
          p_project_id: string
          p_title: string
        }
        Returns: string
      }
      save_daily_report_draft: {
        Args: {
          p_organization_id: string
          p_project_id: string
          p_report_id: string
          p_values: Json
        }
        Returns: string
      }
      save_daily_report_progress: {
        Args: {
          p_boq_version_id: string
          p_entries: Json
          p_organization_id: string
          p_project_id: string
          p_report_id: string
        }
        Returns: undefined
      }
      save_wbs_task: {
        Args: {
          p_organization_id: string
          p_predecessor_ids: string[]
          p_project_id: string
          p_task_id: string
          p_values: Json
        }
        Returns: string
      }
      start_approval_request: {
        Args: {
          p_organization_id: string
          p_project_id: string
          p_requester_comment?: string
          p_resource_id: string
          p_resource_type: string
        }
        Returns: string
      }
      submit_daily_report: {
        Args: {
          p_organization_id: string
          p_project_id: string
          p_report_id: string
        }
        Returns: string
      }
      verify_project_boq_expense: {
        Args: {
          p_expense_id: string
          p_organization_id: string
          p_project_id: string
        }
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
