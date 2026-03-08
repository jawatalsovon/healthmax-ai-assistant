

## Plan: 3 Changes — WhatsApp Fix, Color Theme, Multi-Agent Triage

### 1. WhatsApp on Twilio Number

**The issue**: Twilio numbers don't automatically have WhatsApp. You need to register the number with the **Twilio WhatsApp Sandbox** (free) or apply for a **WhatsApp Business Profile** (production).

**What you need to do** (no code change needed — this is Twilio Console setup):
1. Go to **Twilio Console → Messaging → Try it out → Send a WhatsApp message**
2. Follow the sandbox setup: send `join <sandbox-word>` from your WhatsApp to the Twilio sandbox number (`+1 415 523 8886`)
3. This lets you test WhatsApp messaging via the sandbox
4. For production: Apply via **Twilio Console → Messaging → Senders → WhatsApp Senders** to register your own number

The `send-sms` edge function already supports `channel: "whatsapp"` — no code changes needed there.

---

### 2. Color Theme Overhaul — Medical Blue/Indigo

Replace the current green (`hsl(152, ...)`) theme with a **deep medical blue/indigo** palette that feels professional and healthcare-oriented:

- **Primary**: `220 70% 50%` (rich blue) — trust, medical authority
- **Accent**: `262 60% 55%` (purple/indigo) — modern, AI-forward
- **Safe**: Keep green for safe indicators
- **Emergency/Urgent**: Keep red/orange (functional)
- **Background**: Slight cool blue tint instead of green tint

**Files to edit**:
- `src/index.css` — All CSS custom properties (light + dark mode)
- `tailwind.config.ts` — Update sidebar ring/primary references if needed

---

### 3. Multi-Agent Agentic Triage Workflow

Replace the current single-LLM call in `healthmax-triage` with a **3-agent pipeline** using Lovable AI (no external API keys needed — `LOVABLE_API_KEY` is already configured):

**Architecture**:
```text
Patient Input
     │
     ▼
┌─────────────────┐
│  AGENT 1:       │  Symptom extraction, NER,
│  Symptom Analyst│  structured symptom list
└────────┬────────┘
         │ structured symptoms JSON
         ▼
┌─────────────────┐
│  AGENT 2:       │  Disease matching, specialist
│  Diagnostic     │  routing, urgency assessment
│  Classifier     │  (uses ML predictions + DB)
└────────┬────────┘
         │ diagnosis + urgency JSON
         ▼
┌─────────────────┐
│  AGENT 3:       │  Medicine recommendations,
│  Treatment      │  follow-up questions,
│  Advisor        │  final patient-facing output
└─────────────────┘
```

Each agent is a separate LLM call with a focused system prompt and tool schema. Agents pass structured JSON to the next. This improves accuracy because each agent has a narrow, well-defined task.

**Implementation**: All within `supabase/functions/healthmax-triage/index.ts` — 3 sequential `fetch()` calls to the Lovable AI gateway with different system prompts and tool definitions. The existing safety guard (Layer 1) and ML classifier (Layer 2) remain unchanged — the multi-agent replaces only Layer 3 (the single LLM call).

**Model choice**: `google/gemini-2.5-flash` for Agent 1 & 2 (fast, cheap), `google/gemini-3-flash-preview` for Agent 3 (best reasoning for final output).

---

### Summary of Changes

| Change | Files | Scope |
|--------|-------|-------|
| WhatsApp | None (Twilio Console) | User action |
| Color theme | `src/index.css` | CSS variables only |
| Multi-agent triage | `healthmax-triage/index.ts` | Edge function rewrite of Layer 3 |

