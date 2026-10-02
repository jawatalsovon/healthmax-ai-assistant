# HealthMax web app

The web front end of **[HealthMax](https://github.com/Shafin2954/HealthMax)**, a Bangla, voice-first AI health triage prototype built for the Harvard HSIL Hackathon 2026. **Archived October 2026.**

> [!WARNING]
> Research prototype, not a medical device. It caught only 53% of emergencies on our benchmark (see the main repo's `docs/EVALUATION.md`). The doctors listed in `public/doctors.json` are fictional demo data.

## What's here

- **In-browser triage engine** (`src/lib/browserTriage.ts`): symptom extraction, TF-IDF disease retrieval, an XGBoost classifier exported to JSON, fusion, emergency rules and follow-up questions, running entirely client-side from `public/model/*.json`.
- **Triage chat** (`src/pages/Triage.tsx`): Bangla and English UI, voice input through the Web Speech API (`bn-BD`), up to 3 rounds of follow-up questions.
- **Medicine search**, plus patient, doctor and admin dashboards, and doctor registration (collects a BMDC number).
- **Supabase**: auth and roles, Postgres schema (`supabase/migrations/`), and Edge Functions for triage proxying, medicine search and import, SMS, and Twilio voice and WhatsApp.

## Stack

React 18 · TypeScript · Vite · Tailwind · shadcn/ui · Supabase · Vitest. Originally scaffolded with Lovable.

## Run

```sh
npm install
npm run dev        # http://localhost:8080
```

`.env` holds the Supabase URL and publishable (anon) key, which are public by design (they ship in the browser bundle). Data access depends on the Supabase row-level security policies in `supabase/migrations/`.

Benchmark (needs the main repo checked out around this submodule):

```sh
npx vite-node ../tests/eval_triage.ts
```

Architecture, models, evaluation and post-mortem: see the [main repository](https://github.com/Shafin2954/HealthMax).

## License

[MIT](LICENSE).
