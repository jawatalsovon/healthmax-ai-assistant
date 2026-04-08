import type { DoctorRecommendation, FollowUpAnswer, FollowUpQuestion } from '@/types/triage';

type SparseVector = {
  indices: number[];
  values: number[];
};

type RagRecord = {
  disease: string;
  symptoms: string[];
  urgency?: string;
  specialist?: string;
  facility?: string;
  text_representation?: string;
  vector: SparseVector;
};

type RagArtifacts = {
  vocabulary: Record<string, number>;
  idf: number[];
  ngramRange: [number, number];
  lowercase: boolean;
  records: RagRecord[];
};

type ClassifierTree = {
  leftChildren: number[];
  rightChildren: number[];
  splitIndices: number[];
  splitConditions: number[];
  defaultLeft: number[];
  leafWeights: number[];
};

type ClassifierArtifacts = {
  numClass: number;
  numFeature: number;
  treeInfo: number[];
  trees: ClassifierTree[];
  classBiases: number[];
  labels: string[];
  symptomList: string[];
};

type MedicineRecord = {
  brand_name: string;
  generic_name: string;
  dosage_form: string;
  manufacturer: string;
  price_bdt: number | null;
  search_text: string;
};

type MedicineArtifacts = {
  records: MedicineRecord[];
};

type BrowserArtifacts = {
  classifier: ClassifierArtifacts;
  rag: RagArtifacts;
  medicines: MedicineArtifacts;
};

type DoctorsBySpecialization = Record<string, DoctorRecommendation[]>;

export type TriageSessionState = {
  session_id: string;
  assessment_round: number;
  assessment_total_rounds: number;
  initial_text: string;
  transcript: string[];
};

type DiseasePrediction = {
  disease: string;
  probability: number;
  urgency?: string;
  specialist?: string;
  facility?: string;
  matched_symptoms?: string[];
  support?: {
    classifier_score: number;
    rag_score: number;
    symptom_overlap: number;
    mention_score: number;
  };
};

type TriageDecision = {
  urgency_level: string;
  urgency_label_bn: string;
  facility: string;
  emergency_override: boolean;
  triggered_rule: string | null;
  top_disease: string;
  top_diseases: DiseasePrediction[];
  action_instruction: string;
};

const ARTIFACT_BASE = "/model";

const SYMPTOM_ALIASES: Record<string, string> = {
  "মাথাব্যথা": "মাথা ব্যথা",
  "মাথা ব্যাথা": "মাথা ব্যথা",
  "গা ব্যথা": "শরীর ব্যথা",
  "গায়ে ব্যথা": "শরীর ব্যথা",
  "গায়ে ব্যথা": "শরীর ব্যথা",
  "শরীর ব্যথা": "শরীর ব্যথা",
  "বুক ব্যথা": "বুকে ব্যথা",
  "বুকে ব্যথা": "বুকে ব্যথা",
  "পেটব্যথা": "পেট ব্যথা",
  "পেটে ব্যথা": "পেট ব্যথা",
  "মাথা ঘোরা": "মাথা ঘোরা",
  "শ্বাস নিতে কষ্ট": "শ্বাসকষ্ট",
  "শ্বাস কষ্ট": "শ্বাসকষ্ট",
  "বমি বমি": "বমি বমি ভাব",
  "বমি বমি লাগছে": "বমি বমি ভাব",
  "র‍্যাশ": "র্যাশ",
  "র‌্যাশ": "র্যাশ",
  "রাশ": "র্যাশ",
  "ঠান্ডা": "ঠান্ডা",
};

const DISEASE_KEYWORDS = [
  "ডেঙ্গু",
  "ম্যালেরিয়া",
  "টাইফয়েড",
  "নিউমোনিয়া",
  "ডায়াবেটিস",
  "উচ্চ রক্তচাপ",
  "যক্ষ্মা",
  "কলেরা",
  "জন্ডিস",
  "হাঁপানি",
];

const MEDICINE_KEYWORDS = [
  "প্যারাসিটামল",
  "মেট্রোনিডাজল",
  "অ্যামোক্সিসিলিন",
  "ওরস্যালাইন",
  "ইনসুলিন",
  "এমলোডিপিন",
  "সালবিউটামল",
];

const EMERGENCY_KEYWORDS = [
  "বুকে ব্যথা",
  "বুক ব্যথা",
  "শ্বাস নিতে পারছি না",
  "শ্বাসকষ্ট",
  "শ্বাস কষ্ট",
  "অজ্ঞান",
  "খিঁচুনি",
  "স্ট্রোক",
  "মুখ বাঁকা",
  "হাত অসাড়",
  "প্রচুর রক্তপাত",
  "রক্ত বমি",
  "মুখ দিয়ে রক্ত",
  "শিশুর উচ্চ জ্বর",
  "নবজাতক জ্বর",
  "সাপে কেটেছে",
  "সাপে কামড়",
  "সারা শরীর নীল",
  "জ্ঞান নেই",
];

const URGENT_KEYWORDS = [
  "উচ্চ জ্বর",
  "১০৪ জ্বর",
  "১০৫ জ্বর",
  "তীব্র পেটব্যথা",
  "প্রচণ্ড পেটব্যথা",
  "রক্তে বমি",
  "পানিশূন্যতা",
  "ডিহাইড্রেশন",
  "তীব্র ডায়রিয়া",
  "কলেরার মতো",
];

const FACILITY_MAP: Record<string, string> = {
  EMERGENCY: "জেলা হাসপাতাল বা মেডিকেল কলেজ হাসপাতাল",
  URGENT: "উপজেলা স্বাস্থ্য কমপ্লেক্স বা নিকটস্থ ডাক্তার",
  "SELF-CARE": "কমিউনিটি ক্লিনিক বা বাড়িতে চিকিৎসা",
};

const URGENCY_BANGLA: Record<string, string> = {
  EMERGENCY: "অতি জরুরি 🚨 — এখনই যান",
  URGENT: "জরুরি ⚠️ — আজই যান",
  "SELF-CARE": "স্বাস্থ্যসেবা ✅ — বাড়িতে চিকিৎসা",
};

const DISEASE_NAME_MAP: Record<string, string> = {
  "জ্বর": "Fever",
  "ডেঙ্গু": "Dengue",
  "ম্যালেরিয়া": "Malaria",
  "টাইফয়েড": "Typhoid",
  "নিউমোনিয়া": "Pneumonia",
  "ডায়রিয়া": "Diarrhea",
  "গ্যাস্ট্রোএন্টেরাইটিস": "Gastroenteritis",
  "হাঁপানি": "Asthma",
  "অ্যালার্জি": "Allergy",
  "ইউটিআই": "UTI",
  "সর্দি": "Cold",
};

const DISEASE_GENERIC_HINTS: Record<string, string[]> = {
  fever: ["paracetamol"],
  dengue: ["paracetamol", "oral rehydration salt"],
  malaria: ["paracetamol", "oral rehydration salt"],
  typhoid: ["paracetamol", "oral rehydration salt"],
  diarrhea: ["oral rehydration salt", "zinc sulfate"],
  gastroenteritis: ["oral rehydration salt", "zinc sulfate"],
  cholera: ["oral rehydration salt", "zinc sulfate"],
  allergy: ["cetirizine", "desloratadine", "ketotifen"],
  cold: ["paracetamol", "cetirizine"],
  asthma: ["levosalbutamol", "salbutamol"],
  pneumonia: ["paracetamol"],
};

const FALLBACK_HINTS = ["paracetamol", "oral rehydration salt", "cetirizine"];
const UNSAFE_DOSAGE_PATTERNS = ["injection", "infusion", "vial", "bag"];

let artifactsPromise: Promise<BrowserArtifacts> | null = null;
let doctorsPromise: Promise<DoctorsBySpecialization> | null = null;

const DEFAULT_SPECIALIZATION = "general-medicine";
const TOTAL_ASSESSMENT_ROUNDS = 3;

const DISEASE_SPECIALIZATION_MAP: Array<{ match: string; specialization: string }> = [
  { match: "dengue", specialization: "infectious-disease" },
  { match: "typhoid", specialization: "infectious-disease" },
  { match: "malaria", specialization: "infectious-disease" },
  { match: "pneumonia", specialization: "respiratory" },
  { match: "asthma", specialization: "respiratory" },
  { match: "cold", specialization: "respiratory" },
  { match: "diarrhea", specialization: "gastroenterology" },
  { match: "gastroenteritis", specialization: "gastroenterology" },
  { match: "cholera", specialization: "gastroenterology" },
  { match: "hypertension", specialization: "cardiology" },
  { match: "heart", specialization: "cardiology" },
  { match: "stroke", specialization: "neurology" },
  { match: "migraine", specialization: "neurology" },
  { match: "diabetes", specialization: "endocrinology" },
  { match: "allergy", specialization: "dermatology" },
  { match: "rash", specialization: "dermatology" },
  { match: "ডেঙ্গু", specialization: "infectious-disease" },
  { match: "টাইফয়েড", specialization: "infectious-disease" },
  { match: "ম্যালেরিয়া", specialization: "infectious-disease" },
  { match: "নিউমোনিয়া", specialization: "respiratory" },
  { match: "হাঁপানি", specialization: "respiratory" },
  { match: "ডায়রিয়া", specialization: "gastroenterology" },
  { match: "ডায়রিয়া", specialization: "gastroenterology" },
  { match: "গ্যাস্ট্রো", specialization: "gastroenterology" },
  { match: "উচ্চ রক্তচাপ", specialization: "cardiology" },
  { match: "হার্ট", specialization: "cardiology" },
  { match: "স্ট্রোক", specialization: "neurology" },
  { match: "ডায়াবেটিস", specialization: "endocrinology" },
  { match: "ডায়াবেটিস", specialization: "endocrinology" },
  { match: "অ্যালার্জি", specialization: "dermatology" },
  { match: "র্যাশ", specialization: "dermatology" },
];

const FOLLOW_UP_QUESTION_BANK: Record<string, { round1: FollowUpQuestion[]; round2: FollowUpQuestion[] }> = {
  "infectious-disease": {
    round1: [
      { id: "duration", question_en: "How many days have you had fever?", question_bn: "কত দিন ধরে জ্বর আছে?", type: "open" },
      { id: "high_temp", question_en: "Is your fever above 101°F?", question_bn: "জ্বর কি ১০১°F এর বেশি?", type: "yes_no" },
      { id: "vomit", question_en: "Any vomiting or nausea?", question_bn: "বমি বা বমি ভাব আছে কি?", type: "yes_no" },
      { id: "rash", question_en: "Do you have skin rash?", question_bn: "ত্বকে র্যাশ আছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "water_intake", question_en: "Can you drink enough water?", question_bn: "আপনি কি পর্যাপ্ত পানি খেতে পারছেন?", type: "yes_no" },
      { id: "urination", question_en: "Is urination reduced compared to usual?", question_bn: "স্বাভাবিকের তুলনায় প্রস্রাব কম হচ্ছে কি?", type: "yes_no" },
      { id: "abdominal_pain", question_en: "Do you have abdominal pain?", question_bn: "পেট ব্যথা আছে কি?", type: "yes_no" },
    ],
  },
  respiratory: {
    round1: [
      { id: "breathless", question_en: "Do you feel shortness of breath?", question_bn: "শ্বাসকষ্ট হচ্ছে কি?", type: "yes_no" },
      { id: "cough_days", question_en: "How long have you had cough?", question_bn: "কত দিন ধরে কাশি আছে?", type: "open" },
      { id: "phlegm", question_en: "Is there phlegm with cough?", question_bn: "কাশির সাথে কফ হচ্ছে কি?", type: "yes_no" },
      { id: "wheeze", question_en: "Do you hear wheezing while breathing?", question_bn: "শ্বাস নেয়ার সময় সাঁ সাঁ শব্দ হচ্ছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "night_worse", question_en: "Are symptoms worse at night?", question_bn: "রাতে লক্ষণ বেশি হয় কি?", type: "yes_no" },
      { id: "chest_pain", question_en: "Do you have chest pain while coughing?", question_bn: "কাশির সময় বুক ব্যথা হয় কি?", type: "yes_no" },
      { id: "activity_limit", question_en: "Are daily activities limited due to breathing issues?", question_bn: "শ্বাসকষ্টে দৈনন্দিন কাজ বাধাগ্রস্ত হচ্ছে কি?", type: "yes_no" },
    ],
  },
  gastroenterology: {
    round1: [
      { id: "stool_freq", question_en: "How many loose stools in 24 hours?", question_bn: "২৪ ঘণ্টায় কতবার পাতলা পায়খানা হয়েছে?", type: "open" },
      { id: "stool_blood", question_en: "Any blood in stool?", question_bn: "পায়খানায় রক্ত আছে কি?", type: "yes_no" },
      { id: "vomiting", question_en: "Are you vomiting repeatedly?", question_bn: "বারবার বমি হচ্ছে কি?", type: "yes_no" },
      { id: "abd_cramp", question_en: "Do you have abdominal cramps?", question_bn: "পেটে মোচড় দিয়ে ব্যথা হচ্ছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "dehydration", question_en: "Do you feel very thirsty or weak?", question_bn: "খুব পিপাসা বা দুর্বল লাগছে কি?", type: "yes_no" },
      { id: "fever", question_en: "Do you also have fever?", question_bn: "এর সাথে জ্বর আছে কি?", type: "yes_no" },
      { id: "food_trigger", question_en: "Did symptoms start after outside food?", question_bn: "বাইরের খাবার খাওয়ার পর থেকে শুরু হয়েছে কি?", type: "yes_no" },
    ],
  },
  cardiology: {
    round1: [
      { id: "chest_tight", question_en: "Do you feel chest pressure/tightness?", question_bn: "বুকে চাপ বা টাইট লাগছে কি?", type: "yes_no" },
      { id: "radiation", question_en: "Does pain spread to arm, neck, or jaw?", question_bn: "ব্যথা কি হাত/ঘাড়/চোয়ালে ছড়ায়?", type: "yes_no" },
      { id: "exertion", question_en: "Does it worsen on walking/climbing stairs?", question_bn: "হাঁটা/সিঁড়ি উঠলে বাড়ে কি?", type: "yes_no" },
      { id: "sweating", question_en: "Any unusual sweating with pain?", question_bn: "ব্যথার সাথে অতিরিক্ত ঘাম হচ্ছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "duration", question_en: "How long does each episode last?", question_bn: "প্রতিবার কতক্ষণ থাকে?", type: "open" },
      { id: "rest_relief", question_en: "Does rest relieve the pain?", question_bn: "বিশ্রামে ব্যথা কমে কি?", type: "yes_no" },
      { id: "history", question_en: "Do you have known BP/diabetes history?", question_bn: "উচ্চ রক্তচাপ/ডায়াবেটিসের ইতিহাস আছে কি?", type: "yes_no" },
    ],
  },
  neurology: {
    round1: [
      { id: "one_side", question_en: "Is weakness or numbness on one side?", question_bn: "এক পাশে দুর্বলতা বা অবশভাব আছে কি?", type: "yes_no" },
      { id: "speech", question_en: "Any trouble speaking clearly?", question_bn: "কথা জড়ানো বা বলতে সমস্যা হচ্ছে কি?", type: "yes_no" },
      { id: "headache_type", question_en: "Is headache sudden and severe?", question_bn: "মাথাব্যথা কি হঠাৎ এবং খুব তীব্র?", type: "yes_no" },
      { id: "vision", question_en: "Any blurred vision?", question_bn: "দৃষ্টি ঝাপসা হচ্ছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "repeat", question_en: "Are these symptoms recurring?", question_bn: "এই লক্ষণ বারবার হচ্ছে কি?", type: "yes_no" },
      { id: "duration", question_en: "How long have symptoms persisted?", question_bn: "কতক্ষণ/কতদিন ধরে আছে?", type: "open" },
      { id: "seizure", question_en: "Any seizure or loss of consciousness?", question_bn: "খিঁচুনি বা জ্ঞান হারানোর ঘটনা আছে কি?", type: "yes_no" },
    ],
  },
  endocrinology: {
    round1: [
      { id: "thirst", question_en: "Are you feeling excessive thirst?", question_bn: "অতিরিক্ত পিপাসা লাগে কি?", type: "yes_no" },
      { id: "urine", question_en: "Are you urinating more frequently?", question_bn: "প্রস্রাব কি বারবার হচ্ছে?", type: "yes_no" },
      { id: "weight", question_en: "Any recent unexplained weight change?", question_bn: "হঠাৎ ওজন কমা/বাড়া হয়েছে কি?", type: "yes_no" },
      { id: "fatigue", question_en: "Do you feel unusual fatigue?", question_bn: "অস্বাভাবিক ক্লান্তি লাগছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "blurred_vision", question_en: "Any blurred vision lately?", question_bn: "সাম্প্রতিক সময়ে দৃষ্টি ঝাপসা হচ্ছে কি?", type: "yes_no" },
      { id: "healing", question_en: "Are wounds healing slowly?", question_bn: "ঘা শুকাতে দেরি হচ্ছে কি?", type: "yes_no" },
      { id: "family_history", question_en: "Any family history of diabetes?", question_bn: "পরিবারে ডায়াবেটিসের ইতিহাস আছে কি?", type: "yes_no" },
    ],
  },
  dermatology: {
    round1: [
      { id: "itching", question_en: "Is there itching with the rash?", question_bn: "র্যাশের সাথে চুলকানি আছে কি?", type: "yes_no" },
      { id: "spread", question_en: "Is the rash spreading quickly?", question_bn: "র্যাশ কি দ্রুত ছড়িয়ে যাচ্ছে?", type: "yes_no" },
      { id: "fever", question_en: "Do you have fever along with skin symptoms?", question_bn: "ত্বকের সমস্যার সাথে জ্বর আছে কি?", type: "yes_no" },
      { id: "new_product", question_en: "Started any new food/soap/medicine?", question_bn: "নতুন খাবার/সাবান/ওষুধ শুরু করেছিলেন কি?", type: "yes_no" },
    ],
    round2: [
      { id: "swelling", question_en: "Any swelling of lips/eyes?", question_bn: "ঠোঁট/চোখ ফুলে গেছে কি?", type: "yes_no" },
      { id: "pain", question_en: "Is the area painful or warm?", question_bn: "স্থানটি কি ব্যথাযুক্ত বা গরম?", type: "yes_no" },
      { id: "duration", question_en: "How long have skin symptoms lasted?", question_bn: "কতদিন ধরে ত্বকের সমস্যা আছে?", type: "open" },
    ],
  },
  "general-medicine": {
    round1: [
      { id: "fever", question_en: "Do you have fever?", question_bn: "জ্বর আছে কি?", type: "yes_no" },
      { id: "pain", question_en: "Where is the main pain/discomfort?", question_bn: "মূল ব্যথা/অস্বস্তি কোথায়?", type: "open" },
      { id: "duration", question_en: "How long have symptoms lasted?", question_bn: "কতদিন ধরে লক্ষণ আছে?", type: "open" },
      { id: "daily_life", question_en: "Are daily activities affected?", question_bn: "দৈনন্দিন কাজকর্মে প্রভাব পড়ছে কি?", type: "yes_no" },
    ],
    round2: [
      { id: "worse", question_en: "Are symptoms worsening?", question_bn: "লক্ষণ কি বাড়ছে?", type: "yes_no" },
      { id: "food_sleep", question_en: "Any change in appetite or sleep?", question_bn: "খাওয়া বা ঘুমে পরিবর্তন হয়েছে কি?", type: "yes_no" },
      { id: "med_try", question_en: "Have you taken any medicine already?", question_bn: "ইতিমধ্যে কোনো ওষুধ খেয়েছেন কি?", type: "yes_no" },
    ],
  },
};

function normalizeSurface(text: string): string {
  const beforeParen = String(text).split("(", 1)[0];
  const normalized = beforeParen
    .normalize("NFKC")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/[।,;.!?()]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return SYMPTOM_ALIASES[normalized] ?? normalized;
}

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeSurface(value);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function wordTokens(text: string): string[] {
  const normalized = text.normalize("NFKC").toLowerCase();
  const matches = normalized.match(/[\p{L}\p{N}_]{2,}/gu);
  return matches ?? [];
}

function buildNgrams(tokens: string[], ngramRange: [number, number]): string[] {
  const terms: string[] = [];
  for (let n = ngramRange[0]; n <= ngramRange[1]; n += 1) {
    if (n === 1) {
      terms.push(...tokens);
      continue;
    }
    for (let i = 0; i <= tokens.length - n; i += 1) {
      terms.push(tokens.slice(i, i + n).join(" "));
    }
  }
  return terms;
}

function l2Normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return values;
  }
  return values.map((value) => value / norm);
}

function sparseDot(a: SparseVector, b: SparseVector): number {
  let i = 0;
  let j = 0;
  let score = 0;

  while (i < a.indices.length && j < b.indices.length) {
    const left = a.indices[i];
    const right = b.indices[j];

    if (left === right) {
      score += a.values[i] * b.values[j];
      i += 1;
      j += 1;
    } else if (left < right) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return score;
}

function denseToSparse(values: number[]): SparseVector {
  const indices: number[] = [];
  const sparseValues: number[] = [];

  values.forEach((value, index) => {
    if (value !== 0) {
      indices.push(index);
      sparseValues.push(value);
    }
  });

  return { indices, values: sparseValues };
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - maxLogit));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

function bigrams(value: string): string[] {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 2) {
    return compact ? [compact] : [];
  }

  const grams: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    grams.push(compact.slice(index, index + 2));
  }
  return grams;
}

function fuzzyRatio(left: string, right: string): number {
  if (left === right) {
    return 100;
  }

  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  if (!leftBigrams.length || !rightBigrams.length) {
    return 0;
  }

  const rightCounts = new Map<string, number>();
  for (const gram of rightBigrams) {
    rightCounts.set(gram, (rightCounts.get(gram) ?? 0) + 1);
  }

  let overlap = 0;
  for (const gram of leftBigrams) {
    const count = rightCounts.get(gram) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(gram, count - 1);
    }
  }

  return (200 * overlap) / (leftBigrams.length + rightBigrams.length);
}

async function fetchJson<T>(name: string): Promise<T> {
  const response = await fetch(`${ARTIFACT_BASE}/${name}`);
  if (!response.ok) {
    throw new Error(`Failed to load model artifact: ${name}`);
  }
  return response.json() as Promise<T>;
}

async function loadArtifacts(): Promise<BrowserArtifacts> {
  if (!artifactsPromise) {
    artifactsPromise = Promise.all([
      fetchJson<ClassifierArtifacts>("classifier.json"),
      fetchJson<RagArtifacts>("rag.json"),
      fetchJson<MedicineArtifacts>("medicines.json"),
    ]).then(([classifier, rag, medicines]) => ({ classifier, rag, medicines }));
  }

  return artifactsPromise;
}

async function loadDoctors(): Promise<DoctorsBySpecialization> {
  if (!doctorsPromise) {
    doctorsPromise = fetch("/doctors.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load doctor recommendations");
        }
        return response.json() as Promise<DoctorsBySpecialization>;
      });
  }
  return doctorsPromise;
}

function createSession(initialText: string): TriageSessionState {
  const random = Math.random().toString(36).slice(2, 10);
  return {
    session_id: `browser_${Date.now()}_${random}`,
    assessment_round: 1,
    assessment_total_rounds: TOTAL_ASSESSMENT_ROUNDS,
    initial_text: initialText,
    transcript: [],
  };
}

function pickDoctorSpecialization(topDisease: string): string {
  const normalized = normalizeSurface(topDisease || "");
  for (const item of DISEASE_SPECIALIZATION_MAP) {
    if (normalized.includes(normalizeSurface(item.match))) {
      return item.specialization;
    }
  }
  return DEFAULT_SPECIALIZATION;
}

function sharpenProbabilities(predictions: DiseasePrediction[], round: number): DiseasePrediction[] {
  if (!predictions.length) {
    return predictions;
  }

  const exponent = round >= 3 ? 1.25 : round === 2 ? 1.12 : 1;
  if (exponent === 1) {
    return predictions;
  }

  const adjusted = predictions.map((prediction) => ({
    ...prediction,
    probability: Math.pow(Math.max(prediction.probability || 0, 0), exponent),
  }));
  const total = adjusted.reduce((sum, item) => sum + item.probability, 0) || 1;
  return adjusted.map((item) => ({ ...item, probability: item.probability / total }));
}

function questionsForRound(specialization: string, round: number): FollowUpQuestion[] {
  const bucket = FOLLOW_UP_QUESTION_BANK[specialization] ?? FOLLOW_UP_QUESTION_BANK[DEFAULT_SPECIALIZATION];
  if (round === 1) return bucket.round1;
  if (round === 2) return bucket.round2;
  return [];
}

function stringifyAnswers(answers: FollowUpAnswer[]): string {
  return answers
    .map((answer) => `Q: ${answer.question_en}\nA: ${answer.answer}`)
    .join("\n\n")
    .trim();
}

function loadRuleBasedSymptoms(symptomList: string[]): Array<[string, string]> {
  const canonicalSurfaces = new Set<string>();
  for (const symptom of symptomList) {
    const canonical = normalizeSurface(symptom);
    if (canonical) {
      canonicalSurfaces.add(canonical);
    }
  }

  const aliases = new Map<string, string>();
  for (const canonical of canonicalSurfaces) {
    aliases.set(canonical, canonical);
    aliases.set(canonical.replace(/\s+/g, ""), canonical);
  }

  Object.entries(SYMPTOM_ALIASES).forEach(([alias, canonical]) => {
    aliases.set(normalizeSurface(alias), normalizeSurface(canonical));
  });

  return [...aliases.entries()].sort((left, right) => right[0].length - left[0].length);
}

function knownDiseaseSurfaces(ragRecords: RagRecord[], labels: string[]): string[] {
  const surfaces = new Set<string>();
  for (const record of ragRecords) {
    const disease = normalizeSurface(record.disease);
    if (disease) {
      surfaces.add(disease);
      surfaces.add(normalizeSurface(disease.split("(", 1)[0]));
    }
  }
  for (const label of labels) {
    surfaces.add(normalizeSurface(label));
  }
  for (const disease of DISEASE_KEYWORDS) {
    surfaces.add(normalizeSurface(disease));
  }
  return [...surfaces].filter(Boolean).sort((left, right) => right.length - left.length);
}

function extractSymptoms(
  text: string,
  symptomList: string[],
  ragRecords: RagRecord[],
  labels: string[],
): { symptoms: string[]; diseases: string[]; medicines: string[] } {
  const entities = {
    symptoms: [] as string[],
    diseases: [] as string[],
    medicines: [] as string[],
  };

  const normalizedText = normalizeSurface(text);
  const matchableText = normalizeSurface(text);
  const diseaseSurfaces = knownDiseaseSurfaces(ragRecords, labels);
  const symptomAliases = loadRuleBasedSymptoms(symptomList);

  for (const [alias, canonical] of symptomAliases) {
    if (alias && matchableText.includes(alias) && !entities.symptoms.includes(canonical)) {
      entities.symptoms.push(canonical);
    }
  }

  for (const disease of DISEASE_KEYWORDS) {
    if (text.includes(disease) && !entities.diseases.includes(disease)) {
      entities.diseases.push(disease);
    }
  }

  for (const medicine of MEDICINE_KEYWORDS) {
    if (text.includes(medicine) && !entities.medicines.includes(medicine)) {
      entities.medicines.push(medicine);
    }
  }

  for (const diseaseSurface of diseaseSurfaces) {
    if (diseaseSurface && normalizedText.includes(diseaseSurface) && !entities.diseases.includes(diseaseSurface)) {
      entities.diseases.push(diseaseSurface);
    }
  }

  return entities;
}

function transformQuery(queryText: string, rag: RagArtifacts): SparseVector {
  const tokens = wordTokens(rag.lowercase ? queryText.toLowerCase() : queryText);
  const terms = buildNgrams(tokens, rag.ngramRange);
  const termCounts = new Map<string, number>();

  for (const term of terms) {
    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
  }

  const dense = new Array<number>(rag.idf.length).fill(0);
  for (const [term, count] of termCounts.entries()) {
    const index = rag.vocabulary[term];
    if (index !== undefined) {
      dense[index] = count * rag.idf[index];
    }
  }

  return denseToSparse(l2Normalize(dense));
}

function retrieveDiseases(queryText: string, rag: RagArtifacts, topK = 5): Array<RagRecord & { retrieval_score: number }> {
  const queryVector = transformQuery(queryText, rag);
  return rag.records
    .map((record) => ({
      ...record,
      retrieval_score: sparseDot(queryVector, record.vector),
    }))
    .sort((left, right) => right.retrieval_score - left.retrieval_score)
    .slice(0, topK)
    .filter((record) => record.retrieval_score > 0);
}

function resolveInputSymptom(inputSymptom: string, symptomLookup: Map<string, number>): number | null {
  const normalizedInput = normalizeSurface(inputSymptom);
  const exactMatch = symptomLookup.get(normalizedInput);
  if (exactMatch !== undefined) {
    return exactMatch;
  }

  let bestIndex: number | null = null;
  let bestScore = 0;
  for (const [candidate, index] of symptomLookup.entries()) {
    const score = fuzzyRatio(normalizedInput, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore >= 88 ? bestIndex : null;
}

function runClassifier(symptoms: string[], classifier: ClassifierArtifacts): DiseasePrediction[] {
  const symptomLookup = new Map<string, number>();
  classifier.symptomList.forEach((symptom, index) => {
    symptomLookup.set(normalizeSurface(symptom), index);
  });

  const features = new Array<number>(classifier.numFeature).fill(0);
  for (const symptom of symptoms) {
    const featureIndex = resolveInputSymptom(symptom, symptomLookup);
    if (featureIndex !== null) {
      features[featureIndex] = 1;
    }
  }

  if (!features.some(Boolean)) {
    return [];
  }

  const scores = [...classifier.classBiases];
  classifier.trees.forEach((tree, treeIndex) => {
    let nodeIndex = 0;
    while (tree.leftChildren[nodeIndex] !== -1) {
      const featureIndex = tree.splitIndices[nodeIndex];
      const threshold = tree.splitConditions[nodeIndex];
      const value = features[featureIndex];
      const goLeft = Number.isNaN(value)
        ? Boolean(tree.defaultLeft[nodeIndex])
        : value < threshold;
      nodeIndex = goLeft ? tree.leftChildren[nodeIndex] : tree.rightChildren[nodeIndex];
    }
    scores[classifier.treeInfo[treeIndex]] += tree.leafWeights[nodeIndex];
  });

  const probabilities = softmax(scores);
  return probabilities
    .map((probability, index) => ({
      disease: classifier.labels[index] ?? "Unknown",
      probability,
    }))
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 5)
    .filter((prediction) => prediction.probability > 0.05);
}

function bestFuzzyScore(query: string, candidates: string[]): number {
  let best = 0;
  for (const candidate of candidates) {
    best = Math.max(best, fuzzyRatio(query, candidate));
  }
  return best;
}

function recordSymptomSurfaces(record: RagRecord): string[] {
  return uniqueNormalized(Array.isArray(record.symptoms) ? record.symptoms : []);
}

function diseaseSurface(recordOrName: RagRecord | string): string {
  if (typeof recordOrName === "string") {
    return normalizeSurface(recordOrName);
  }
  return normalizeSurface(recordOrName.disease);
}

function symptomOverlap(inputSymptoms: string[], candidateSymptoms: string[]): { score: number; matched: string[] } {
  const normalizedInputs = uniqueNormalized(inputSymptoms);
  const normalizedCandidates = uniqueNormalized(candidateSymptoms);

  if (!normalizedInputs.length || !normalizedCandidates.length) {
    return { score: 0, matched: [] };
  }

  const matchedCandidates = new Set<number>();
  const matchedInputs: string[] = [];

  for (const inputSymptom of normalizedInputs) {
    let bestIndex = -1;
    let bestScore = 0;

    normalizedCandidates.forEach((candidateSymptom, index) => {
      if (matchedCandidates.has(index)) {
        return;
      }

      if (
        inputSymptom === candidateSymptom ||
        inputSymptom.includes(candidateSymptom) ||
        candidateSymptom.includes(inputSymptom)
      ) {
        bestIndex = index;
        bestScore = 100;
        return;
      }

      const score = fuzzyRatio(inputSymptom, candidateSymptom);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });

    if (bestIndex >= 0 && bestScore >= 86) {
      matchedCandidates.add(bestIndex);
      matchedInputs.push(inputSymptom);
    }
  }

  return {
    score: matchedInputs.length ? matchedInputs.length / Math.max(1, normalizedInputs.length) : 0,
    matched: matchedInputs,
  };
}

function diseaseMentionStrength(diseaseMentions: string[], diseaseName: string): number {
  const candidateSurface = diseaseSurface(diseaseName);
  if (!candidateSurface) {
    return 0;
  }

  let bestScore = 0;
  for (const mention of diseaseMentions) {
    const normalizedMention = normalizeSurface(mention);
    if (!normalizedMention) {
      continue;
    }
    if (normalizedMention === candidateSurface) {
      return 1;
    }
    if (normalizedMention.includes(candidateSurface) || candidateSurface.includes(normalizedMention)) {
      bestScore = Math.max(bestScore, 0.85);
      continue;
    }
    const fuzzy = bestFuzzyScore(normalizedMention, [candidateSurface]);
    if (fuzzy >= 92) {
      bestScore = Math.max(bestScore, 0.75);
    }
  }

  return bestScore;
}

function mergeDiseasePredictions(
  symptoms: string[],
  diseaseMentions: string[],
  classifierResults: DiseasePrediction[],
  ragResults: Array<RagRecord & { retrieval_score: number }>,
  allDiseaseRecords: RagRecord[],
  topN = 3,
): DiseasePrediction[] {
  const recordLookup = new Map<string, RagRecord>();
  allDiseaseRecords.forEach((record) => {
    if (record.disease?.trim()) {
      recordLookup.set(record.disease.trim(), record);
    }
  });

  const candidates = new Map<
    string,
    {
      disease: string;
      record?: RagRecord;
      classifierScore: number;
      ragScore: number;
      symptomOverlap: number;
      matchedSymptoms: string[];
      mentionScore: number;
      rawScore: number;
    }
  >();

  const ensureCandidate = (diseaseName: string) => {
    if (!candidates.has(diseaseName)) {
      candidates.set(diseaseName, {
        disease: diseaseName,
        record: recordLookup.get(diseaseName),
        classifierScore: 0,
        ragScore: 0,
        symptomOverlap: 0,
        matchedSymptoms: [],
        mentionScore: 0,
        rawScore: 0,
      });
    }
    return candidates.get(diseaseName)!;
  };

  const normalizedSymptoms = uniqueNormalized(symptoms);
  const maxClassifierProbability = Math.max(0, ...classifierResults.map((item) => item.probability ?? 0));
  if (maxClassifierProbability > 0) {
    classifierResults.forEach((result) => {
      const diseaseName = result.disease?.trim();
      if (!diseaseName) {
        return;
      }
      const candidate = ensureCandidate(diseaseName);
      candidate.classifierScore = Math.max(candidate.classifierScore, (result.probability ?? 0) / maxClassifierProbability);
    });
  }

  const maxRagScore = Math.max(0, ...ragResults.map((item) => Math.max(0, item.retrieval_score)));
  if (maxRagScore > 0) {
    ragResults.forEach((result) => {
      const diseaseName = result.disease?.trim();
      if (!diseaseName) {
        return;
      }
      const candidate = ensureCandidate(diseaseName);
      candidate.record = result;
      candidate.ragScore = Math.max(candidate.ragScore, Math.max(0, result.retrieval_score) / maxRagScore);
    });
  }

  allDiseaseRecords.forEach((record) => {
    const diseaseName = record.disease?.trim();
    if (!diseaseName) {
      return;
    }
    const overlap = symptomOverlap(normalizedSymptoms, recordSymptomSurfaces(record));
    const mentionScore = diseaseMentionStrength(diseaseMentions, diseaseName);
    if (overlap.score <= 0 && mentionScore <= 0) {
      return;
    }

    const candidate = ensureCandidate(diseaseName);
    candidate.record = record;
    if (overlap.score > candidate.symptomOverlap) {
      candidate.symptomOverlap = overlap.score;
      candidate.matchedSymptoms = overlap.matched;
    }
    candidate.mentionScore = Math.max(candidate.mentionScore, mentionScore);
  });

  if (!candidates.size) {
    return [];
  }

  const rankedCandidates = [...candidates.values()]
    .map((candidate) => {
      const matchedCount = candidate.matchedSymptoms.length;
      const mentionBonus = 1.35 * candidate.mentionScore;
      const overlapBonus = 0.95 * candidate.symptomOverlap + 0.22 * matchedCount;
      const classifierBonus = 0.3 * candidate.classifierScore;
      const ragBonus = 0.25 * candidate.ragScore;
      return {
        ...candidate,
        rawScore: mentionBonus + overlapBonus + classifierBonus + ragBonus,
      };
    })
    .sort((left, right) => (
      right.rawScore - left.rawScore ||
      right.mentionScore - left.mentionScore ||
      right.symptomOverlap - left.symptomOverlap ||
      right.classifierScore - left.classifierScore ||
      right.ragScore - left.ragScore
    ))
    .slice(0, Math.max(1, topN));

  let totalScore = rankedCandidates.reduce((sum, candidate) => sum + Math.max(candidate.rawScore, 0), 0);
  if (totalScore <= 0) {
    totalScore = rankedCandidates.length || 1;
  }

  return rankedCandidates.map((candidate) => ({
    disease: candidate.disease,
    probability: Math.max(candidate.rawScore, 0) / totalScore,
    urgency: candidate.record?.urgency ?? "URGENT",
    specialist: candidate.record?.specialist ?? "General Physician",
    facility: candidate.record?.facility ?? "Upazila Health Complex",
    matched_symptoms: candidate.matchedSymptoms,
    support: {
      classifier_score: Number(candidate.classifierScore.toFixed(4)),
      rag_score: Number(candidate.ragScore.toFixed(4)),
      symptom_overlap: Number(candidate.symptomOverlap.toFixed(4)),
      mention_score: Number(candidate.mentionScore.toFixed(4)),
    },
  }));
}

function ragPredictions(ragResults: Array<RagRecord & { retrieval_score: number }>, topN = 3): DiseasePrediction[] {
  const selected = ragResults.slice(0, topN);
  let totalScore = selected.reduce((sum, record) => sum + record.retrieval_score, 0);
  if (totalScore <= 0) {
    totalScore = 1;
  }
  return selected.map((record) => ({
    disease: record.disease,
    probability: record.retrieval_score / totalScore,
  }));
}

function applyTriageRules(
  text: string,
  symptoms: string[],
  classifierResults: DiseasePrediction[],
  ragResults: Array<RagRecord & { retrieval_score: number }>,
  mergedResults: DiseasePrediction[],
): TriageDecision {
  const combinedText = `${text} ${symptoms.join(" ")}`;
  const preferredPredictions = mergedResults.length ? mergedResults : classifierResults.length ? classifierResults : ragPredictions(ragResults);

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      return {
        urgency_level: "EMERGENCY",
        urgency_label_bn: URGENCY_BANGLA.EMERGENCY,
        facility: FACILITY_MAP.EMERGENCY,
        emergency_override: true,
        triggered_rule: keyword,
        top_disease: preferredPredictions[0]?.disease ?? "অজানা",
        top_diseases: preferredPredictions,
        action_instruction: `⚠️ '${keyword}' উপসর্গ শনাক্ত হয়েছে। এখনই ৯৯৯ কল করুন অথবা নিকটস্থ জেলা হাসপাতালে নিয়ে যান।`,
      };
    }
  }

  for (const keyword of URGENT_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      const fallbackPredictions = preferredPredictions.length ? preferredPredictions : ragPredictions(ragResults);
      const topDisease = fallbackPredictions[0]?.disease ?? ragResults[0]?.disease ?? "অজানা";
      return {
        urgency_level: "URGENT",
        urgency_label_bn: URGENCY_BANGLA.URGENT,
        facility: FACILITY_MAP.URGENT,
        emergency_override: false,
        triggered_rule: keyword,
        top_disease: topDisease,
        top_diseases: fallbackPredictions,
        action_instruction: "আজই উপজেলা স্বাস্থ্য কমপ্লেক্সে যান। দেরি করবেন না।",
      };
    }
  }

  const topPrediction = preferredPredictions[0];
  const topProbability = topPrediction?.probability ?? 0;

  let urgency = "SELF-CARE";
  if (topPrediction && topProbability >= 0.2) {
    const topDisease = topPrediction.disease;
    const highUrgencyDiseases = [
      "Dengue",
      "Typhoid",
      "Pneumonia",
      "Malaria",
      "Cholera",
      "ডেঙ্গু",
      "টাইফয়েড",
      "নিউমোনিয়া",
      "ম্যালেরিয়া",
      "কলেরা",
    ];
    if (highUrgencyDiseases.some((candidate) => topDisease.includes(candidate))) {
      urgency = "URGENT";
    }
  } else if (ragResults[0]?.urgency) {
    urgency = String(ragResults[0].urgency).toUpperCase();
  }

  const topDisease = topPrediction?.disease
    ?? ragResults[0]?.disease
    ?? classifierResults[0]?.disease
    ?? "নির্ধারণ সম্ভব হয়নি";
  const displayPredictions = preferredPredictions.length ? preferredPredictions : (ragPredictions(ragResults).length ? ragPredictions(ragResults) : classifierResults);

  return {
    urgency_level: urgency,
    urgency_label_bn: URGENCY_BANGLA[urgency] ?? URGENCY_BANGLA["SELF-CARE"],
    facility: FACILITY_MAP[urgency] ?? FACILITY_MAP["SELF-CARE"],
    emergency_override: false,
    triggered_rule: null,
    top_disease: topDisease,
    top_diseases: displayPredictions,
    action_instruction: "স্থানীয় স্বাস্থ্যকেন্দ্রে যান এবং ডাক্তারের পরামর্শ নিন।",
  };
}

function lookupDrugs(diseaseName: string, medicines: MedicineArtifacts) {
  const normalizedName = (DISEASE_NAME_MAP[diseaseName] ?? diseaseName).toLowerCase();
  const hints = DISEASE_GENERIC_HINTS[normalizedName] ?? [];
  const searchTerms = hints.length ? hints : [normalizedName];

  const search = (terms: string[]) => {
    const matches = medicines.records.filter((record) =>
      terms.some((term) => record.search_text.includes(term.toLowerCase())),
    );
    if (!matches.length) {
      return [];
    }

    const safeMatches = matches.filter((record) =>
      !UNSAFE_DOSAGE_PATTERNS.some((pattern) => record.dosage_form.toLowerCase().includes(pattern)),
    );

    const records = safeMatches.length ? safeMatches : matches;
    const deduped = new Map<string, MedicineRecord>();
    records.forEach((record) => {
      const key = `${record.brand_name}|${record.generic_name}|${record.dosage_form}|${record.manufacturer}|${record.price_bdt ?? ""}`;
      if (!deduped.has(key)) {
        deduped.set(key, record);
      }
    });

    return [...deduped.values()];
  };

  let matched = search(searchTerms);
  if (!matched.length) {
    matched = search(FALLBACK_HINTS);
  }

  return matched
    .sort((left, right) => {
      const leftPrice = left.price_bdt ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.price_bdt ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice || left.brand_name.localeCompare(right.brand_name);
    })
    .slice(0, 3)
    .map((record) => {
      const price = record.price_bdt ?? 0;
      return {
        generic_name: record.generic_name,
        brand_example: record.brand_name,
        price_bdt: price,
        unit: record.dosage_form || "unit",
        manufacturer: record.manufacturer,
        affordable: price <= 10,
        affordable_label: price <= 10 ? "সাশ্রয়ী 💚" : "মধ্যম মূল্য",
      };
    });
}

function toLovableDiseases(topDiseases: DiseasePrediction[]) {
  return topDiseases.map((disease) => {
    const probability = Number(disease.probability ?? 0);
    const confidence = probability <= 1 ? probability * 100 : probability;
    return {
      name: disease.disease || "Unknown",
      name_bn: disease.disease || "Unknown",
      confidence: Number(confidence.toFixed(2)),
    };
  });
}

function toLovableMedicines(drugs: Array<{ brand_example: string; generic_name: string; price_bdt: number; unit: string }>) {
  return drugs.map((drug) => ({
    name: drug.brand_example || "",
    generic: drug.generic_name || "",
    price: `৳${Number(drug.price_bdt ?? 0).toFixed(2)} / ${drug.unit || "unit"}`,
  }));
}

function templateResponse(triageDecision: TriageDecision, drugRecommendations: Array<{ generic_name: string; price_bdt: number; unit: string }>) {
  const urgency = triageDecision.urgency_level ?? "URGENT";
  const facility = triageDecision.facility ?? "উপজেলা স্বাস্থ্য কমপ্লেক্স";
  const topDisease = triageDecision.top_disease ?? "অজানা";

  let drugText = "";
  if (drugRecommendations.length) {
    const drug = drugRecommendations[0];
    drugText = `\n💊 ওষুধ: ${drug.generic_name} — ৳${drug.price_bdt} প্রতি ${drug.unit}`;
  }

  if (urgency === "EMERGENCY") {
    return `🚨 জরুরি অবস্থা! এখনই ৯৯৯ কল করুন অথবা নিকটস্থ জেলা হাসপাতালে যান!\nসম্ভাব্য: ${topDisease}\n\n⚠️ এটি পরামর্শ, ডাক্তারের বিকল্প নয়।`;
  }

  return `আপনার উপসর্গ দেখে মনে হচ্ছে সম্ভাব্য রোগ: ${topDisease}\n🏥 যোগাযোগ করুন: ${facility}${drugText}\n\n⚠️ এটি পরামর্শ, ডাক্তারের বিকল্প নয়।`;
}

export async function runBrowserTriage(
  text: string,
  session: TriageSessionState | null = null,
  followUpAnswers: FollowUpAnswer[] = [],
) {
  const artifacts = await loadArtifacts();
  const doctorsBySpecialization = await loadDoctors();

  const isInitialRequest = !session;
  const normalizedText = (text || "").trim();
  const activeSession = session ? { ...session, transcript: [...session.transcript] } : createSession(normalizedText);

  if (!isInitialRequest) {
    const answerSummary = stringifyAnswers(followUpAnswers);
    if (answerSummary) {
      activeSession.transcript.push(answerSummary);
    } else if (normalizedText) {
      activeSession.transcript.push(normalizedText);
    }
    activeSession.assessment_round = Math.min(activeSession.assessment_round + 1, activeSession.assessment_total_rounds);
  }

  const combinedInput = [activeSession.initial_text, ...activeSession.transcript].filter(Boolean).join("\n");
  const nerEntities = extractSymptoms(
    combinedInput,
    artifacts.classifier.symptomList,
    artifacts.rag.records,
    artifacts.classifier.labels,
  );

  const symptoms = [...nerEntities.symptoms];
  const diseaseMentions = [...nerEntities.diseases];
  const rankingTerms = [...symptoms, ...diseaseMentions];
  const retrievalQuery = rankingTerms.length ? rankingTerms.join(", ") : combinedInput;
  const ragResults = rankingTerms.length ? retrieveDiseases(retrievalQuery, artifacts.rag, 5) : [];
  const classifierResults = symptoms.length ? runClassifier(symptoms, artifacts.classifier) : [];
  const mergedPredictions = mergeDiseasePredictions(
    symptoms,
    diseaseMentions,
    classifierResults,
    ragResults,
    artifacts.rag.records,
    3,
  );

  const triageDecision = applyTriageRules(combinedInput, symptoms, classifierResults, ragResults, mergedPredictions);
  const adjustedTopDiseases = sharpenProbabilities(
    triageDecision.top_diseases ?? [],
    activeSession.assessment_round,
  );
  const topPrediction = adjustedTopDiseases[0];
  const topDisease = topPrediction?.disease || triageDecision.top_disease || "Unknown";
  const drugRecommendations = lookupDrugs(topDisease, artifacts.medicines);

  const doctorSpecialization = pickDoctorSpecialization(topDisease);
  const partnerDoctors = (doctorsBySpecialization[doctorSpecialization] || doctorsBySpecialization[DEFAULT_SPECIALIZATION] || []).slice(0, 3);

  const isFinalAssessment =
    activeSession.assessment_round >= activeSession.assessment_total_rounds ||
    String(triageDecision.urgency_level || "").toUpperCase() === "EMERGENCY";

  const stage = isFinalAssessment
    ? "final"
    : activeSession.assessment_round === 1
      ? "initial"
      : "follow_up";

  const followUpQuestions = isFinalAssessment
    ? []
    : questionsForRound(doctorSpecialization, activeSession.assessment_round);

  const llmResponse = isFinalAssessment
    ? templateResponse(
        { ...triageDecision, top_disease: topDisease, top_diseases: adjustedTopDiseases },
        drugRecommendations,
      )
    : activeSession.assessment_round === 1
      ? "Preliminary assessment ready. Please answer the follow-up questions so I can improve confidence."
      : "Updated assessment prepared. A few more targeted questions will help finalize confidence.";

  const specialist = topPrediction?.specialist || ragResults[0]?.specialist || "General Physician";
  const facilityRecommendation = triageDecision.facility || "উপজেলা স্বাস্থ্য কমপ্লেক্স";

  return {
    session_id: activeSession.session_id,
    triage_session: activeSession,
    input_text: combinedInput,
    ner_entities: nerEntities,
    top_diseases: adjustedTopDiseases,
    diseases: toLovableDiseases(adjustedTopDiseases),
    urgency_level: triageDecision.urgency_level,
    urgency_label_bn: triageDecision.urgency_label_bn,
    facility_recommendation: facilityRecommendation,
    recommended_facility: facilityRecommendation,
    recommended_facility_bn: facilityRecommendation,
    specialist,
    drug_recommendations: drugRecommendations,
    medicines: toLovableMedicines(drugRecommendations),
    follow_up_questions: followUpQuestions,
    assessment_round: activeSession.assessment_round,
    assessment_total_rounds: activeSession.assessment_total_rounds,
    assessment_stage: stage,
    is_final_assessment: isFinalAssessment,
    partner_doctors: isFinalAssessment ? partnerDoctors : [],
    doctor_specialization_key: doctorSpecialization,
    llm_response: llmResponse,
    explanation: llmResponse,
    explanation_bn: llmResponse,
    ml_classifier_used: true,
    ai_fallback: true,
    emergency_override: triageDecision.emergency_override ?? false,
    disclaimer: "⚠️ এটি পরামর্শ, ডাক্তারের বিকল্প নয়।",
  };
}
