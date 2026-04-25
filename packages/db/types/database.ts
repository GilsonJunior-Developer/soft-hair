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
      appointment_status_log: {
        Row: {
          appointment_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["appointment_status"] | null
          id: string
          reason: string | null
          salon_id: string
          to_status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          appointment_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["appointment_status"] | null
          id?: string
          reason?: string | null
          salon_id: string
          to_status: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          appointment_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["appointment_status"] | null
          id?: string
          reason?: string | null
          salon_id?: string
          to_status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancel_token: string
          client_id: string
          commission_calculated_brl: number | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          ends_at: string
          id: string
          idempotency_key: string | null
          price_brl_discount: number
          price_brl_final: number
          price_brl_original: number
          professional_id: string
          referral_token_id: string | null
          salon_id: string
          scheduled_at: string
          service_id: string
          source: Database["public"]["Enums"]["appointment_source"]
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancel_token: string
          client_id: string
          commission_calculated_brl?: number | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes: number
          ends_at: string
          id?: string
          idempotency_key?: string | null
          price_brl_discount?: number
          price_brl_final: number
          price_brl_original: number
          professional_id: string
          referral_token_id?: string | null
          salon_id: string
          scheduled_at: string
          service_id: string
          source?: Database["public"]["Enums"]["appointment_source"]
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancel_token?: string
          client_id?: string
          commission_calculated_brl?: number | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          ends_at?: string
          id?: string
          idempotency_key?: string | null
          price_brl_discount?: number
          price_brl_final?: number
          price_brl_original?: number
          professional_id?: string
          referral_token_id?: string | null
          salon_id?: string
          scheduled_at?: string
          service_id?: string
          source?: Database["public"]["Enums"]["appointment_source"]
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_referral_token_id_fkey"
            columns: ["referral_token_id"]
            isOneToOne: false
            referencedRelation: "referral_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credits_log: {
        Row: {
          amount_brl: number
          appointment_id: string | null
          balance_after_brl: number
          client_id: string
          created_at: string
          id: string
          referral_id: string | null
          salon_id: string
        }
        Insert: {
          amount_brl: number
          appointment_id?: string | null
          balance_after_brl: number
          client_id: string
          created_at?: string
          id?: string
          referral_id?: string | null
          salon_id: string
        }
        Update: {
          amount_brl?: number
          appointment_id?: string | null
          balance_after_brl?: number
          client_id?: string
          created_at?: string
          id?: string
          referral_id?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_log_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          credit_balance_brl: number
          deleted_at: string | null
          email: string | null
          id: string
          lgpd_consent_at: string | null
          lgpd_consent_text_hash: string | null
          name: string
          notes: string | null
          phone_e164: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_balance_brl?: number
          deleted_at?: string | null
          email?: string | null
          id?: string
          lgpd_consent_at?: string | null
          lgpd_consent_text_hash?: string | null
          name: string
          notes?: string | null
          phone_e164: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_balance_brl?: number
          deleted_at?: string | null
          email?: string | null
          id?: string
          lgpd_consent_at?: string | null
          lgpd_consent_text_hash?: string | null
          name?: string
          notes?: string | null
          phone_e164?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          appointment_id: string
          commission_amount_brl: number
          created_at: string
          id: string
          percent_applied: number
          professional_id: string
          salon_id: string
          service_price_brl: number
          settled_at: string | null
        }
        Insert: {
          appointment_id: string
          commission_amount_brl: number
          created_at?: string
          id?: string
          percent_applied: number
          professional_id: string
          salon_id: string
          service_price_brl: number
          settled_at?: string | null
        }
        Update: {
          appointment_id?: string
          commission_amount_brl?: number
          created_at?: string
          id?: string
          percent_applied?: number
          professional_id?: string
          salon_id?: string
          service_price_brl?: number
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string
          created_at: string
          emitted_at: string | null
          id: string
          last_error: string | null
          municipio: string | null
          number: string | null
          pdf_url: string | null
          protocol: string | null
          provider: Database["public"]["Enums"]["invoice_provider"]
          retry_count: number
          salon_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          emitted_at?: string | null
          id?: string
          last_error?: string | null
          municipio?: string | null
          number?: string | null
          pdf_url?: string | null
          protocol?: string | null
          provider?: Database["public"]["Enums"]["invoice_provider"]
          retry_count?: number
          salon_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          emitted_at?: string | null
          id?: string
          last_error?: string | null
          municipio?: string | null
          number?: string | null
          pdf_url?: string | null
          protocol?: string | null
          provider?: Database["public"]["Enums"]["invoice_provider"]
          retry_count?: number
          salon_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_log: {
        Row: {
          appointment_id: string | null
          channel: Database["public"]["Enums"]["messaging_channel"]
          client_id: string | null
          cost_brl: number | null
          created_at: string
          direction: Database["public"]["Enums"]["messaging_direction"]
          id: string
          payload_jsonb: Json | null
          provider_message_id: string | null
          salon_id: string
          status: Database["public"]["Enums"]["messaging_status"]
          template_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          channel: Database["public"]["Enums"]["messaging_channel"]
          client_id?: string | null
          cost_brl?: number | null
          created_at?: string
          direction: Database["public"]["Enums"]["messaging_direction"]
          id?: string
          payload_jsonb?: Json | null
          provider_message_id?: string | null
          salon_id: string
          status?: Database["public"]["Enums"]["messaging_status"]
          template_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          channel?: Database["public"]["Enums"]["messaging_channel"]
          client_id?: string | null
          cost_brl?: number | null
          created_at?: string
          direction?: Database["public"]["Enums"]["messaging_direction"]
          id?: string
          payload_jsonb?: Json | null
          provider_message_id?: string | null
          salon_id?: string
          status?: Database["public"]["Enums"]["messaging_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          bio: string | null
          commission_default_percent: number
          commission_mode: Database["public"]["Enums"]["commission_mode"]
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          salon_id: string
          slug: string
          specialties: string[]
          updated_at: string
          user_id: string | null
          working_hours_jsonb: Json
        }
        Insert: {
          bio?: string | null
          commission_default_percent?: number
          commission_mode?: Database["public"]["Enums"]["commission_mode"]
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          salon_id: string
          slug: string
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
          working_hours_jsonb?: Json
        }
        Update: {
          bio?: string | null
          commission_default_percent?: number
          commission_mode?: Database["public"]["Enums"]["commission_mode"]
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          salon_id?: string
          slug?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
          working_hours_jsonb?: Json
        }
        Relationships: [
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          referrer_client_id: string
          salon_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          referrer_client_id: string
          salon_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          referrer_client_id?: string
          salon_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_tokens_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tokens_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tokens_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          confirmed_at: string | null
          created_at: string
          credit_amount_brl: number
          first_appointment_id: string
          id: string
          referral_token_id: string
          referred_client_id: string
          referrer_client_id: string
          salon_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          credit_amount_brl: number
          first_appointment_id: string
          id?: string
          referral_token_id: string
          referred_client_id: string
          referrer_client_id: string
          salon_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          credit_amount_brl?: number
          first_appointment_id?: string
          id?: string
          referral_token_id?: string
          referred_client_id?: string
          referrer_client_id?: string
          salon_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_first_appointment_id_fkey"
            columns: ["first_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referral_token_id_fkey"
            columns: ["referral_token_id"]
            isOneToOne: false
            referencedRelation: "referral_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          salon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          salon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_members_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_members_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          city: string | null
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_user_id: string
          settings_jsonb: Json
          slug: string
          subscription_plan: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          owner_user_id: string
          settings_jsonb?: Json
          slug: string
          subscription_plan?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          settings_jsonb?: Json
          slug?: string
          subscription_plan?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salons_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          category: string
          created_at: string
          default_duration_minutes: number
          id: string
          name: string
          suggested_price_brl: number
        }
        Insert: {
          category: string
          created_at?: string
          default_duration_minutes: number
          id?: string
          name: string
          suggested_price_brl: number
        }
        Update: {
          category?: string
          created_at?: string
          default_duration_minutes?: number
          id?: string
          name?: string
          suggested_price_brl?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          catalog_id: string | null
          category: string
          commission_override_percent: number | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_brl: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          catalog_id?: string | null
          category: string
          commission_override_percent?: number | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_brl: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          catalog_id?: string | null
          category?: string
          commission_override_percent?: number | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_brl?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          default_salon_id: string | null
          email: string
          id: string
          is_superadmin: boolean
          name: string
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_salon_id?: string | null
          email: string
          id: string
          is_superadmin?: boolean
          name: string
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_salon_id?: string | null
          email?: string
          id?: string
          is_superadmin?: boolean
          name?: string
          phone_e164?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_default_salon_fk"
            columns: ["default_salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_default_salon_fk"
            columns: ["default_salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          approved_at: string | null
          category: Database["public"]["Enums"]["wa_template_category"]
          created_at: string
          id: string
          language: string
          meta_status: Database["public"]["Enums"]["wa_template_status"]
          name: string
          placeholders: string[]
        }
        Insert: {
          approved_at?: string | null
          category: Database["public"]["Enums"]["wa_template_category"]
          created_at?: string
          id?: string
          language?: string
          meta_status?: Database["public"]["Enums"]["wa_template_status"]
          name: string
          placeholders?: string[]
        }
        Update: {
          approved_at?: string | null
          category?: Database["public"]["Enums"]["wa_template_category"]
          created_at?: string
          id?: string
          language?: string
          meta_status?: Database["public"]["Enums"]["wa_template_status"]
          name?: string
          placeholders?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      public_professionals_v: {
        Row: {
          bio: string | null
          id: string | null
          name: string | null
          photo_url: string | null
          salon_id: string | null
          slug: string | null
          specialties: string[] | null
        }
        Insert: {
          bio?: string | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          salon_id?: string | null
          slug?: string | null
          specialties?: string[] | null
        }
        Update: {
          bio?: string | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          salon_id?: string | null
          slug?: string | null
          specialties?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      public_salons_v: {
        Row: {
          city: string | null
          id: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          city?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          city?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      public_services_v: {
        Row: {
          category: string | null
          duration_minutes: number | null
          id: string | null
          name: string | null
          price_brl: number | null
          salon_id: string | null
        }
        Insert: {
          category?: string | null
          duration_minutes?: number | null
          id?: string | null
          name?: string | null
          price_brl?: number | null
          salon_id?: string | null
        }
        Update: {
          category?: string | null
          duration_minutes?: number | null
          id?: string | null
          name?: string | null
          price_brl?: number | null
          salon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "public_salons_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_public_appointment: {
        Args: {
          p_appointment_id: string
          p_cancel_token: string
          p_reason?: string
        }
        Returns: {
          appointment_id: string
          canceled_at: string
          status: string
        }[]
      }
      check_appointment_conflict: {
        Args: {
          p_duration_minutes: number
          p_exclude_appointment_id?: string
          p_professional_id: string
          p_salon_id: string
          p_scheduled_at: string
        }
        Returns: boolean
      }
      cleanup_expired_referral_tokens: { Args: never; Returns: number }
      compute_public_availability: {
        Args: {
          p_from: string
          p_professional_slug: string
          p_salon_slug: string
          p_service_id: string
          p_to: string
        }
        Returns: {
          slot_at: string
        }[]
      }
      create_appointment_atomic: {
        Args: {
          p_client_email?: string
          p_client_id?: string
          p_client_name?: string
          p_client_phone?: string
          p_notes?: string
          p_professional_id: string
          p_scheduled_at: string
          p_service_id: string
          p_source?: string
        }
        Returns: {
          cancel_token: string
          client_id: string
          commission_calculated_brl: number | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          ends_at: string
          id: string
          idempotency_key: string | null
          price_brl_discount: number
          price_brl_final: number
          price_brl_original: number
          professional_id: string
          referral_token_id: string | null
          salon_id: string
          scheduled_at: string
          service_id: string
          source: Database["public"]["Enums"]["appointment_source"]
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_public_booking_atomic: {
        Args: {
          p_client_email: string
          p_client_name: string
          p_client_phone: string
          p_lgpd_consent_text_hash: string
          p_professional_slug: string
          p_salon_slug: string
          p_scheduled_at: string
          p_service_id: string
        }
        Returns: {
          appointment_id: string
          cancel_token: string
          ends_at: string
          price_brl: number
          professional_name: string
          salon_name: string
          salon_slug: string
          scheduled_at: string
          service_name: string
        }[]
      }
      create_salon_bootstrap: {
        Args: { p_city?: string; p_cnpj?: string; p_name: string }
        Returns: {
          city: string | null
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_user_id: string
          settings_jsonb: Json
          slug: string
          subscription_plan: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "salons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_salon_ids: { Args: never; Returns: string[] }
      get_public_appointment: {
        Args: { p_appointment_id: string; p_cancel_token: string }
        Returns: {
          appointment_id: string
          cancel_window_hours: number
          client_email: string
          client_name: string
          duration_minutes: number
          ends_at: string
          price_brl: number
          professional_name: string
          professional_slug: string
          salon_city: string
          salon_name: string
          salon_slug: string
          scheduled_at: string
          service_duration_minutes: number
          service_id: string
          service_name: string
          status: string
        }[]
      }
      get_public_booking: {
        Args: { p_appointment_id: string; p_cancel_token: string }
        Returns: {
          appointment_id: string
          client_email: string
          client_name: string
          ends_at: string
          price_brl: number
          professional_name: string
          professional_slug: string
          salon_name: string
          salon_slug: string
          scheduled_at: string
          service_name: string
          status: string
        }[]
      }
      is_salon_owner: { Args: { p_salon_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      reschedule_public_appointment: {
        Args: {
          p_new_scheduled_at: string
          p_old_appointment_id: string
          p_old_cancel_token: string
        }
        Returns: {
          appointment_id: string
          cancel_token: string
          ends_at: string
          price_brl: number
          professional_name: string
          professional_slug: string
          salon_name: string
          salon_slug: string
          scheduled_at: string
          service_name: string
        }[]
      }
      salon_messaging_cost_month: {
        Args: { p_month?: number; p_salon_id: string; p_year?: number }
        Returns: number
      }
      slugify: { Args: { input: string }; Returns: string }
      transition_appointment_status: {
        Args: {
          p_appointment_id: string
          p_reason?: string
          p_to: Database["public"]["Enums"]["appointment_status"]
        }
        Returns: {
          cancel_token: string
          client_id: string
          commission_calculated_brl: number | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          ends_at: string
          id: string
          idempotency_key: string | null
          price_brl_discount: number
          price_brl_final: number
          price_brl_original: number
          professional_id: string
          referral_token_id: string | null
          salon_id: string
          scheduled_at: string
          service_id: string
          source: Database["public"]["Enums"]["appointment_source"]
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unaccent_portuguese: { Args: { input: string }; Returns: string }
    }
    Enums: {
      appointment_source: "PUBLIC_LINK" | "MANUAL_BY_STAFF" | "REFERRAL"
      appointment_status:
        | "PENDING_CONFIRMATION"
        | "CONFIRMED"
        | "COMPLETED"
        | "NO_SHOW"
        | "CANCELED"
      commission_mode: "PERCENT_FIXED" | "TABLE"
      invoice_provider: "NUVEM_FISCAL" | "FOCUS_NFE"
      invoice_status: "PENDING" | "EMITTED" | "FAILED" | "CANCELED"
      messaging_channel: "WHATSAPP" | "SMS" | "EMAIL"
      messaging_direction: "OUTBOUND" | "INBOUND"
      messaging_status: "SENT" | "DELIVERED" | "READ" | "FAILED"
      referral_status: "PENDING" | "CONFIRMED" | "EXPIRED"
      subscription_status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED"
      user_role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL"
      wa_template_category: "UTILITY" | "MARKETING" | "AUTHENTICATION"
      wa_template_status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED"
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
      appointment_source: ["PUBLIC_LINK", "MANUAL_BY_STAFF", "REFERRAL"],
      appointment_status: [
        "PENDING_CONFIRMATION",
        "CONFIRMED",
        "COMPLETED",
        "NO_SHOW",
        "CANCELED",
      ],
      commission_mode: ["PERCENT_FIXED", "TABLE"],
      invoice_provider: ["NUVEM_FISCAL", "FOCUS_NFE"],
      invoice_status: ["PENDING", "EMITTED", "FAILED", "CANCELED"],
      messaging_channel: ["WHATSAPP", "SMS", "EMAIL"],
      messaging_direction: ["OUTBOUND", "INBOUND"],
      messaging_status: ["SENT", "DELIVERED", "READ", "FAILED"],
      referral_status: ["PENDING", "CONFIRMED", "EXPIRED"],
      subscription_status: ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"],
      user_role: ["OWNER", "RECEPTIONIST", "PROFESSIONAL"],
      wa_template_category: ["UTILITY", "MARKETING", "AUTHENTICATION"],
      wa_template_status: ["PENDING", "APPROVED", "REJECTED", "DISABLED"],
    },
  },
} as const
