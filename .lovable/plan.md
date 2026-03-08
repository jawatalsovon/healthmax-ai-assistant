

## Plan: BanglaBERT Integration, Light Red Theme, Voice for Follow-ups

### 1. BanglaBERT via HuggingFace Inference API

**Important context**: BanglaBERT is an ELECTRA discriminator model (pretrained, not fine-tuned for any specific task). It's a Python/PyTorch model that cannot run in a browser or Deno edge function directly. However, HuggingFace provides a **free Inference API** that we can call via HTTP from an edge function.

**How we'll use it**: BanglaBERT's Inference API supports **feature extraction** (embeddings). We'll use it in Agent 1 (Symptom Analyst) to get Bangla text embeddings for better symptom matching — comparing the patient's Bangla input against known symptom terms using cosine similarity of BanglaBERT embeddings, rather than the current Levenshtein-based fuzzy matching.

**Implementation**:
- Add a call to `https://api-inference.huggingface.co/models/csebuetnlp/banglabert` in the `healthmax-triage` edge function
- Use it for Bangla symptom text → embeddings → cosine similarity with known symptom embeddings
- Falls back to existing Levenshtein matching if HF API is slow/unavailable
- **No API key needed** — HuggingFace free Inference API works without auth for public models (rate-limited)

**Files**: `supabase/functions/healthmax-triage/index.ts`

---

### 2. Light Red / Rose Theme

Replace the blue/indigo palette with a warm **rose/coral** healthcare theme:

- **Primary**: `350 70% 55%` (soft rose-red)
- **Accent**: `340 65% 47%` (deeper rose)
- **Secondary**: `350 50% 95%` (light pink tint)
- **Background**: `350 20% 98%` (warm off-white)
- **Safe/Emergency/Urgent**: Unchanged (functional colors)

Light, warm, and healthcare-appropriate — think medical cross red but softened.

**Files**: `src/index.css` (light + dark mode variables)

---

### 3. Voice Input for Follow-up Questions

Add a microphone button next to the text input fields in `FollowUpQuestions.tsx`. Uses the same Web Speech API (`SpeechRecognition`) already used in the main triage input.

- For free-text follow-up questions: add a mic icon button beside the `Input` field
- On click, starts speech recognition in the correct language (bn-BD or en-US)
- Transcribed text fills the answer field
- Yes/no and choice questions remain as buttons (no voice needed)

**Files**: `src/components/FollowUpQuestions.tsx`

