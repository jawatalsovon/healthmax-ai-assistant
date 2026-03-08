
## CURRENT STATE
✗ Project is blank (only basic routing setup)
✗ No database/backend integration
✗ No HealthMax pages or features
✗ No edge functions
✗ No medicine data imported

## WHAT I WILL BUILD (Full Implementation)

### PHASE 1: BACKEND SETUP (Supabase/Lovable Cloud)
1. **Database Schema**
   - `medicines` table (21k+ DGDA drugs): id, brand_name, generic_name, form, strength, manufacturer, price_bdt, salt_composition
   - `symptoms_diseases` table: disease_id, disease_name_bn, disease_name_en, common_symptoms, description, emergency_flag, specialist_type
   - `clinical_rules` table: rule_id, symptom_pattern, urgency_level, recommended_action
   - `triage_sessions` table: session_id, user_id, symptoms, diseases_predicted, urgency, medicines_suggested, timestamp
   - `users` table (CHW accounts): id, email, name, role, clinic_location

2. **Edge Functions** (3 total)
   - `healthmax-triage`: Core AI engine with Gemini (safety guard + AI reasoning)
   - `healthmax-followup`: Process follow-up answers to refine diagnosis
   - `medicine-search`: Query medicine database with filters

### PHASE 2: FRONTEND PAGES (React/Vite)
1. **Landing Page** (`/`)
   - Hero section with Bangladesh health stats
   - Bilingual toggle (Bangla/English)
   - Feature cards explaining the app
   - "Start Triage" CTA button
   - Architecture diagram visualization

2. **Patient Triage Interface** (`/triage`)
   - Text input for symptoms (Bangla/English)
   - Voice input button (Web Speech API)
   - Real-time symptom entity highlighting (NER-style)
   - AI-powered follow-up questions (one at a time)
   - Results card showing:
     * Top 5 diseases with confidence bars (Recharts)
     * Color-coded urgency badge (Emergency/Urgent/Self-Care)
     * Recommended facility type
     * Generic medicine suggestions with BDT prices

3. **Medicine Search Page** (`/medicines`)
   - Searchable/filterable medicine database
   - Brand name, generic, form, manufacturer filters
   - Price comparison and generic alternatives
   - Pharmacy availability simulation

4. **CHW Dashboard** (`/dashboard`)
   - Protected login-based area
   - Session history with triage outcomes
   - Analytics: cases handled, emergency referrals, disease distribution
   - Charts using Recharts (disease frequency, urgency distribution, time trends)

5. **About/Architecture Page** (`/about`)
   - Visual pipeline diagram
   - Team & hackathon context
   - Health statistics for Bangladesh

### PHASE 3: KEY FEATURES
1. **Clinical Safety Rules Engine**
   - Hard-coded emergency overrides (chest pain, difficulty breathing, seizure, etc.)
   - Rules checked BEFORE AI reasoning
   - Immediate EMERGENCY response for red flags

2. **Real Gemini AI Integration**
   - Symptom analysis with structured JSON responses
   - Disease probability inference
   - Follow-up question generation
   - Medicine recommendation logic

3. **Medicine Database**
   - Import CSV data (21k+ records)
   - Real BDT pricing
   - Generic alternative lookup
   - Manufacturer information

4. **Responsive Design**
   - Mobile-first (CHWs use phones)
   - Bangla font support (Noto Sans Bengali)
   - Dark mode support
   - Large touch targets for rural use

### PHASE 4: IMPLEMENTATION SEQUENCE
1. Set up Supabase with all tables
2. Import medicine CSV data
3. Build landing page + routing
4. Create triage interface (text + voice input)
5. Implement edge functions (triage, followup, medicine-search)
6. Connect frontend to edge functions
7. Build medicine search page
8. Create CHW dashboard with analytics
9. Add about/architecture page
10. Test end-to-end flow
11. Add dark mode & polish
12. Export for GitHub sharing

### TECHNICAL DETAILS
- **LLM**: Google Gemini API (via edge functions) for medical reasoning
- **Database**: Supabase (Lovable Cloud preferred)
- **UI**: Tailwind + shadcn/ui (already installed)
- **Charting**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Voice**: Web Speech API (no external service needed)
- **Styling**: Noto Sans Bengali for Bangla text, green/white/blue medical theme

### ESTIMATED OUTPUT
- 10+ React components (pages + features)
- 3 edge functions
- 1 complete database schema
- 1 medicine dataset (21k+ records)
- Fully working demo for HSIL Hackathon 2026

This will be a **production-ready, shareable codebase** that you can directly push to GitHub.
