export interface Disease {
  name: string;
  name_bn: string;
  confidence: number;
}

export interface MedicineAlt {
  brand: string;
  manufacturer: string;
  price: string;
}

export interface Medicine {
  name: string;
  generic: string;
  price: string;
  alternatives?: MedicineAlt[];
}

export interface FollowUpQuestion {
  question_en: string;
  question_bn: string;
  type: 'yes_no' | 'choice' | 'open';
  options_en?: string[];
  options_bn?: string[];
}

export interface TriageResult {
  urgency_level: string;
  diseases: Disease[];
  follow_up_questions?: FollowUpQuestion[];
  // Legacy single question support
  follow_up_question?: string;
  follow_up_question_bn?: string;
  recommended_facility?: string;
  recommended_facility_bn?: string;
  specialist?: string;
  medicines?: Medicine[];
  explanation?: string;
  explanation_bn?: string;
  ml_classifier_used?: boolean;
  ai_fallback?: boolean;
  can_generate_prescription?: boolean;
  session_id?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  result?: TriageResult;
}

export interface PatientInfo {
  full_name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  blood_group?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_doctor_id?: string;
}
