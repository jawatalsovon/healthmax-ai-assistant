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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clinical_rules: {
        Row: {
          created_at: string
          id: number
          recommended_action: string
          recommended_action_bn: string | null
          symptom_pattern: string
          symptom_pattern_bn: string | null
          urgency_level: string
        }
        Insert: {
          created_at?: string
          id?: number
          recommended_action: string
          recommended_action_bn?: string | null
          symptom_pattern: string
          symptom_pattern_bn?: string | null
          urgency_level: string
        }
        Update: {
          created_at?: string
          id?: number
          recommended_action?: string
          recommended_action_bn?: string | null
          symptom_pattern?: string
          symptom_pattern_bn?: string | null
          urgency_level?: string
        }
        Relationships: []
      }
      medicine_ner: {
        Row: {
          common_medical_terms: string | null
          created_at: string
          disease: string | null
          hormone: string | null
          id: number
          medical_text: string
          medicine_name: string | null
          organ: string | null
          pharmacological_class: string | null
        }
        Insert: {
          common_medical_terms?: string | null
          created_at?: string
          disease?: string | null
          hormone?: string | null
          id?: number
          medical_text: string
          medicine_name?: string | null
          organ?: string | null
          pharmacological_class?: string | null
        }
        Update: {
          common_medical_terms?: string | null
          created_at?: string
          disease?: string | null
          hormone?: string | null
          id?: number
          medical_text?: string
          medicine_name?: string | null
          organ?: string | null
          pharmacological_class?: string | null
        }
        Relationships: []
      }
      medicines: {
        Row: {
          brand_name: string
          created_at: string
          form: string | null
          generic_name: string | null
          id: number
          manufacturer: string | null
          medicine_type: string | null
          pack_info: string | null
          price_info: string | null
          slug: string | null
          strength: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string
          form?: string | null
          generic_name?: string | null
          id?: number
          manufacturer?: string | null
          medicine_type?: string | null
          pack_info?: string | null
          price_info?: string | null
          slug?: string | null
          strength?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          form?: string | null
          generic_name?: string | null
          id?: number
          manufacturer?: string | null
          medicine_type?: string | null
          pack_info?: string | null
          price_info?: string | null
          slug?: string | null
          strength?: string | null
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          address: string | null
          age: number | null
          allergies: string[] | null
          blood_group: string | null
          chronic_conditions: string[] | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          preferred_doctor_id: string | null
          session_user_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string[] | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          preferred_doctor_id?: string | null
          session_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string[] | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          preferred_doctor_id?: string | null
          session_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          ai_generated_prescription: Json
          created_at: string
          diseases: Json | null
          doctor_id: string | null
          doctor_notes: string | null
          doctor_revised_prescription: Json | null
          final_prescription: Json | null
          id: string
          medicines: Json | null
          notified_via_sms: boolean | null
          patient_profile_id: string | null
          patient_symptoms: string | null
          preferred_doctor_id: string | null
          signed_at: string | null
          sms_sent_at: string | null
          status: string
          triage_session_id: string | null
          triage_summary: Json | null
          updated_at: string
          urgency_level: string | null
        }
        Insert: {
          ai_generated_prescription?: Json
          created_at?: string
          diseases?: Json | null
          doctor_id?: string | null
          doctor_notes?: string | null
          doctor_revised_prescription?: Json | null
          final_prescription?: Json | null
          id?: string
          medicines?: Json | null
          notified_via_sms?: boolean | null
          patient_profile_id?: string | null
          patient_symptoms?: string | null
          preferred_doctor_id?: string | null
          signed_at?: string | null
          sms_sent_at?: string | null
          status?: string
          triage_session_id?: string | null
          triage_summary?: Json | null
          updated_at?: string
          urgency_level?: string | null
        }
        Update: {
          ai_generated_prescription?: Json
          created_at?: string
          diseases?: Json | null
          doctor_id?: string | null
          doctor_notes?: string | null
          doctor_revised_prescription?: Json | null
          final_prescription?: Json | null
          id?: string
          medicines?: Json | null
          notified_via_sms?: boolean | null
          patient_profile_id?: string | null
          patient_symptoms?: string | null
          preferred_doctor_id?: string | null
          signed_at?: string | null
          sms_sent_at?: string | null
          status?: string
          triage_session_id?: string | null
          triage_summary?: Json | null
          updated_at?: string
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "registered_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_preferred_doctor_id_fkey"
            columns: ["preferred_doctor_id"]
            isOneToOne: false
            referencedRelation: "registered_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_triage_session_id_fkey"
            columns: ["triage_session_id"]
            isOneToOne: false
            referencedRelation: "triage_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          organization: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      registered_doctors: {
        Row: {
          bio: string | null
          bmdc_reg_number: string
          created_at: string
          email: string | null
          full_name: string
          hospital_affiliation: string | null
          id: string
          is_available: boolean
          is_verified: boolean
          phone: string | null
          specialization: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bio?: string | null
          bmdc_reg_number: string
          created_at?: string
          email?: string | null
          full_name: string
          hospital_affiliation?: string | null
          id?: string
          is_available?: boolean
          is_verified?: boolean
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bio?: string | null
          bmdc_reg_number?: string
          created_at?: string
          email?: string | null
          full_name?: string
          hospital_affiliation?: string | null
          id?: string
          is_available?: boolean
          is_verified?: boolean
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      specialist_classifications: {
        Row: {
          created_at: string
          gender: string | null
          id: number
          problem_text: string
          specialist: string
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id?: number
          problem_text: string
          specialist: string
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: number
          problem_text?: string
          specialist?: string
        }
        Relationships: []
      }
      symptom_disease_matrix: {
        Row: {
          created_at: string
          disease_name: string
          id: number
          symptoms: Json
        }
        Insert: {
          created_at?: string
          disease_name: string
          id?: number
          symptoms?: Json
        }
        Update: {
          created_at?: string
          disease_name?: string
          id?: number
          symptoms?: Json
        }
        Relationships: []
      }
      symptoms_diseases: {
        Row: {
          created_at: string
          description: string | null
          disease_name_bn: string | null
          disease_name_en: string
          emergency_flag: boolean | null
          id: number
          specialist_type: string | null
          symptoms: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          disease_name_bn?: string | null
          disease_name_en: string
          emergency_flag?: boolean | null
          id?: number
          specialist_type?: string | null
          symptoms?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          disease_name_bn?: string | null
          disease_name_en?: string
          emergency_flag?: boolean | null
          id?: number
          specialist_type?: string | null
          symptoms?: string[]
        }
        Relationships: []
      }
      triage_sessions: {
        Row: {
          conversation: Json | null
          created_at: string
          diseases_predicted: Json | null
          follow_up_questions: Json | null
          id: string
          language: string | null
          medicines_suggested: Json | null
          patient_profile_id: string | null
          session_user_id: string | null
          symptoms_text: string
          updated_at: string
          urgency_level: string | null
        }
        Insert: {
          conversation?: Json | null
          created_at?: string
          diseases_predicted?: Json | null
          follow_up_questions?: Json | null
          id?: string
          language?: string | null
          medicines_suggested?: Json | null
          patient_profile_id?: string | null
          session_user_id?: string | null
          symptoms_text: string
          updated_at?: string
          urgency_level?: string | null
        }
        Update: {
          conversation?: Json | null
          created_at?: string
          diseases_predicted?: Json | null
          follow_up_questions?: Json | null
          id?: string
          language?: string | null
          medicines_suggested?: Json | null
          patient_profile_id?: string | null
          session_user_id?: string | null
          symptoms_text?: string
          updated_at?: string
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_sessions_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_prescription: {
        Args: { _rx_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "healthcare_professional" | "regular_user" | "admin"
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
      app_role: ["healthcare_professional", "regular_user", "admin"],
    },
  },
} as const
