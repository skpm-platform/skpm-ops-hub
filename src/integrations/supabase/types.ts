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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accommodations: {
        Row: {
          camp_name: string
          cost_per_bed: number | null
          created_at: string
          id: string
          location: string | null
          occupied_beds: number | null
          status: string | null
          total_beds: number | null
        }
        Insert: {
          camp_name: string
          cost_per_bed?: number | null
          created_at?: string
          id?: string
          location?: string | null
          occupied_beds?: number | null
          status?: string | null
          total_beds?: number | null
        }
        Update: {
          camp_name?: string
          cost_per_bed?: number | null
          created_at?: string
          id?: string
          location?: string | null
          occupied_beds?: number | null
          status?: string | null
          total_beds?: number | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          message: string | null
          pinned: boolean | null
          priority: string | null
          publish_date: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          message?: string | null
          pinned?: boolean | null
          priority?: string | null
          publish_date?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          message?: string | null
          pinned?: boolean | null
          priority?: string | null
          publish_date?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_tag: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          current_value: number | null
          id: string
          location: string | null
          name: string
          purchase_date: string | null
          purchase_price: number | null
          status: string | null
        }
        Insert: {
          asset_tag?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          location?: string | null
          name: string
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
        }
        Update: {
          asset_tag?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          location?: string | null
          name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          module: string | null
          record_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          module?: string | null
          record_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          module?: string | null
          record_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendees: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          end_datetime: string | null
          id: string
          location: string | null
          start_datetime: string
          title: string
          type: string | null
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_datetime?: string | null
          id?: string
          location?: string | null
          start_datetime?: string
          title: string
          type?: string | null
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_datetime?: string | null
          id?: string
          location?: string | null
          start_datetime?: string
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          location: string | null
          name: string
          phone: string | null
          status: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          name: string
          phone?: string | null
          status?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          auto_renew: boolean | null
          client_id: string | null
          contract_no: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          type: string | null
          value: number | null
        }
        Insert: {
          auto_renew?: boolean | null
          client_id?: string | null
          contract_no?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          type?: string | null
          value?: number | null
        }
        Update: {
          auto_renew?: boolean | null
          client_id?: string | null
          contract_no?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          type?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          created_at: string
          daily_rate: number | null
          end_date: string | null
          id: string
          requisition_id: string | null
          start_date: string | null
          status: string | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          daily_rate?: number | null
          end_date?: string | null
          id?: string
          requisition_id?: string | null
          start_date?: string | null
          status?: string | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          daily_rate?: number | null
          end_date?: string | null
          id?: string
          requisition_id?: string | null
          start_date?: string | null
          status?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployments_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          file_url: string | null
          id: string
          name: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          name: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          name?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      duty_roster: {
        Row: {
          created_at: string
          date: string
          employee_id: string | null
          end_time: string | null
          id: string
          notes: string | null
          shift: string | null
          site_id: string | null
          start_time: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          shift?: string | null
          site_id?: string | null
          start_time?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          shift?: string | null
          site_id?: string | null
          start_time?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duty_roster_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          employee_id: string | null
          id: string
          join_date: string | null
          name: string
          nationality: string | null
          passport_no: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          salary: number | null
          site_id: string | null
          status: string | null
          user_id: string | null
          visa_expiry: string | null
          visa_no: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          id?: string
          join_date?: string | null
          name: string
          nationality?: string | null
          passport_no?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          salary?: number | null
          site_id?: string | null
          status?: string | null
          user_id?: string | null
          visa_expiry?: string | null
          visa_no?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          id?: string
          join_date?: string | null
          name?: string
          nationality?: string | null
          passport_no?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          salary?: number | null
          site_id?: string | null
          status?: string | null
          user_id?: string | null
          visa_expiry?: string | null
          visa_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          project_id: string | null
          receipt_url: string | null
          status: string | null
          submitted_by: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          status?: string | null
          submitted_by?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          status?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          area_sqm: number | null
          client_id: string | null
          contract_type: string | null
          created_at: string
          emirate: string | null
          id: string
          location: string | null
          name: string
          status: string | null
          type: string | null
        }
        Insert: {
          area_sqm?: number | null
          client_id?: string | null
          contract_type?: string | null
          created_at?: string
          emirate?: string | null
          id?: string
          location?: string | null
          name: string
          status?: string | null
          type?: string | null
        }
        Update: {
          area_sqm?: number | null
          client_id?: string | null
          contract_type?: string | null
          created_at?: string
          emirate?: string | null
          id?: string
          location?: string | null
          name?: string
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_passes: {
        Row: {
          created_at: string
          id: string
          issued_by: string | null
          notes: string | null
          pass_no: string | null
          pass_type: string | null
          site_id: string | null
          status: string | null
          valid_from: string | null
          valid_until: string | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          pass_no?: string | null
          pass_type?: string | null
          site_id?: string | null
          status?: string | null
          valid_from?: string | null
          valid_until?: string | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          pass_no?: string | null
          pass_type?: string | null
          site_id?: string | null
          status?: string | null
          valid_from?: string | null
          valid_until?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_passes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_passes_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          priority: string | null
          raised_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          ticket_no: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          raised_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          ticket_no?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          raised_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          ticket_no?: string | null
          title?: string
        }
        Relationships: []
      }
      hse_incidents: {
        Row: {
          action_taken: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          injured_person: string | null
          reported_by: string | null
          site_id: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          injured_person?: string | null
          reported_by?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          injured_person?: string | null
          reported_by?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hse_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          id: string
          location: string | null
          min_stock: number | null
          name: string
          quantity: number | null
          sku: string | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          min_stock?: number | null
          name: string
          quantity?: number | null
          sku?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          min_stock?: number | null
          name?: string
          quantity?: number | null
          sku?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          id: string
          inventory_id: string | null
          type: string | null
          quantity: number | null
          note: string | null
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          type?: string | null
          quantity?: number | null
          note?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          inventory_id?: string | null
          type?: string | null
          quantity?: number | null
          note?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_no: string | null
          issue_date: string | null
          items: Json | null
          paid_date: string | null
          payment_method: string | null
          project_id: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          vat: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          items?: Json | null
          paid_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          vat?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          items?: Json | null
          paid_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          days: number | null
          employee_id: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string | null
          type: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          days?: number | null
          employee_id?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          type?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          days?: number | null
          employee_id?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          asset_name: string | null
          assigned_to: string | null
          created_at: string
          frequency: string | null
          id: string
          last_done: string | null
          next_due: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          asset_name?: string | null
          assigned_to?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          last_done?: string | null
          next_due?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          asset_name?: string | null
          assigned_to?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          last_done?: string | null
          next_due?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      manpower: {
        Row: {
          id: string
          name: string
          trade: string | null
          camp_name: string | null
          visa_expiry: string | null
          passport_no: string | null
          nationality: string | null
          status: string | null
          daily_rate: number | null
          created_at: string | null
          updated_at: string | null
          client_id: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          name: string
          trade?: string | null
          camp_name?: string | null
          visa_expiry?: string | null
          passport_no?: string | null
          nationality?: string | null
          status?: string | null
          daily_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
          client_id?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          trade?: string | null
          camp_name?: string | null
          visa_expiry?: string | null
          passport_no?: string | null
          nationality?: string | null
          status?: string | null
          daily_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
          client_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manpower_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manpower_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_billing: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          month: number
          notes: string | null
          project_id: string | null
          rate: number | null
          status: string | null
          total_amount: number | null
          total_days: number | null
          total_workers: number | null
          year: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          project_id?: string | null
          rate?: number | null
          status?: string | null
          total_amount?: number | null
          total_days?: number | null
          total_workers?: number | null
          year?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          project_id?: string | null
          rate?: number | null
          status?: string | null
          total_amount?: number | null
          total_days?: number | null
          total_workers?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "mp_billing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_billing_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          basic_salary: number | null
          created_at: string
          deductions: number | null
          employee_id: string | null
          food_allowance: number | null
          housing_allowance: number | null
          id: string
          month: number
          net_pay: number | null
          overtime_pay: number | null
          status: string | null
          transport_allowance: number | null
          year: number
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string | null
          food_allowance?: number | null
          housing_allowance?: number | null
          id?: string
          month?: number
          net_pay?: number | null
          overtime_pay?: number | null
          status?: string | null
          transport_allowance?: number | null
          year?: number
        }
        Update: {
          basic_salary?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string | null
          food_allowance?: number | null
          housing_allowance?: number | null
          id?: string
          month?: number
          net_pay?: number | null
          overtime_pay?: number | null
          status?: string | null
          transport_allowance?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          manager_id: string | null
          name: string
          priority: string | null
          project_no: string | null
          site_id: string | null
          spent: number | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manager_id?: string | null
          name: string
          priority?: string | null
          project_no?: string | null
          site_id?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          priority?: string | null
          project_no?: string | null
          site_id?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          date: string | null
          id: string
          items: Json | null
          po_no: string | null
          status: string | null
          total: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          items?: Json | null
          po_no?: string | null
          status?: string | null
          total?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          items?: Json | null
          po_no?: string | null
          status?: string | null
          total?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
      quotations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          date: string | null
          id: string
          items: Json | null
          quote_no: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          valid_until: string | null
          vat: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          items?: Json | null
          quote_no?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          valid_until?: string | null
          vat?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          items?: Json | null
          quote_no?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          valid_until?: string | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          duration: string | null
          id: string
          quantity: number | null
          site_id: string | null
          start_date: string | null
          status: string | null
          trade: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          duration?: string | null
          id?: string
          quantity?: number | null
          site_id?: string | null
          start_date?: string | null
          status?: string | null
          trade?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          duration?: string | null
          id?: string
          quantity?: number | null
          site_id?: string | null
          start_date?: string | null
          status?: string | null
          trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          enabled: boolean
          id: string
          module_key: string
          role: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          module_key: string
          role: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          module_key?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          client_id: string | null
          created_at: string
          emirate: string | null
          gps_coordinates: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          status: string | null
          type: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          emirate?: string | null
          gps_coordinates?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          status?: string | null
          type?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          emirate?: string | null
          gps_coordinates?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          approved_by: string | null
          created_at: string
          date: string
          employee_id: string | null
          hours_worked: number | null
          id: string
          notes: string | null
          overtime_hours: number | null
          project_id: string | null
          site_id: string | null
          status: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          date?: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          project_id?: string | null
          site_id?: string | null
          status?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          date?: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          project_id?: string | null
          site_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          attendees: Json | null
          created_at: string
          date: string | null
          duration: string | null
          id: string
          status: string | null
          title: string
          trainer: string | null
          type: string | null
          venue: string | null
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          date?: string | null
          duration?: string | null
          id?: string
          status?: string | null
          title: string
          trainer?: string | null
          type?: string | null
          venue?: string | null
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          date?: string | null
          duration?: string | null
          id?: string
          status?: string | null
          title?: string
          trainer?: string | null
          type?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: []
      }
      trip_logs: {
        Row: {
          created_at: string
          date: string | null
          driver_id: string | null
          from_location: string | null
          fuel_cost: number | null
          id: string
          km: number | null
          purpose: string | null
          to_location: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          driver_id?: string | null
          from_location?: string | null
          fuel_cost?: number | null
          id?: string
          km?: number | null
          purpose?: string | null
          to_location?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          driver_id?: string | null
          from_location?: string | null
          fuel_cost?: number | null
          id?: string
          km?: number | null
          purpose?: string | null
          to_location?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          enabled: boolean
          id: string
          module_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          module_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          module_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          assigned_driver: string | null
          capacity: number | null
          created_at: string
          id: string
          make_model: string | null
          plate_number: string | null
          registration_expiry: string | null
          status: string | null
          type: string | null
          vehicle_no: string | null
        }
        Insert: {
          assigned_driver?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          make_model?: string | null
          plate_number?: string | null
          registration_expiry?: string | null
          status?: string | null
          type?: string | null
          vehicle_no?: string | null
        }
        Update: {
          assigned_driver?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          make_model?: string | null
          plate_number?: string | null
          registration_expiry?: string | null
          status?: string | null
          type?: string | null
          vehicle_no?: string | null
        }
        Relationships: []
      }
      visitor_log: {
        Row: {
          badge_no: string | null
          check_in: string | null
          check_out: string | null
          company: string | null
          created_at: string
          host_id: string | null
          id: string
          name: string
          purpose: string | null
          vehicle_plate: string | null
        }
        Insert: {
          badge_no?: string | null
          check_in?: string | null
          check_out?: string | null
          company?: string | null
          created_at?: string
          host_id?: string | null
          id?: string
          name: string
          purpose?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          badge_no?: string | null
          check_in?: string | null
          check_out?: string | null
          company?: string | null
          created_at?: string
          host_id?: string | null
          id?: string
          name?: string
          purpose?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          site_id: string | null
          status: string | null
          title: string
          type: string | null
          wo_no: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          site_id?: string | null
          status?: string | null
          title: string
          type?: string | null
          wo_no?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          site_id?: string | null
          status?: string | null
          title?: string
          type?: string | null
          wo_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string
          id: string
          medical_expiry: string | null
          name: string
          nationality: string | null
          safety_card_expiry: string | null
          status: string | null
          trade: string | null
          visa_expiry: string | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medical_expiry?: string | null
          name: string
          nationality?: string | null
          safety_card_expiry?: string | null
          status?: string | null
          trade?: string | null
          visa_expiry?: string | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medical_expiry?: string | null
          name?: string
          nationality?: string | null
          safety_card_expiry?: string | null
          status?: string | null
          trade?: string | null
          visa_expiry?: string | null
          worker_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: undefined
      }
      admin_update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      delete_user_notifications: {
        Args: { _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      upsert_system_setting: {
        Args: { _key: string; _updated_by?: string; _value: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "manager"
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
      app_role: ["admin", "staff", "manager"],
    },
  },
} as const
