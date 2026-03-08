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
          symptoms_text?: string
          updated_at?: string
          urgency_level?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "healthcare_professional" | "regular_user"
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
      app_role: ["healthcare_professional", "regular_user"],
    },
  },
} as const
