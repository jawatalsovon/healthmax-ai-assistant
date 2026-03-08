import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Brain, Shield, Stethoscope, Pill, ArrowRight, Database, Activity } from 'lucide-react';

export default function About() {
  const { lang } = useLanguage();

  const pipelineSteps = [
    { icon: Mic, label: lang === 'bn' ? 'ইনপুট (টেক্সট/ভয়েস)' : 'Input (Text/Voice)', color: 'bg-accent' },
    { icon: Shield, label: lang === 'bn' ? 'নিরাপত্তা গার্ড' : 'Safety Guard', color: 'bg-emergency' },
    { icon: Brain, label: lang === 'bn' ? 'NER সত্তা চিহ্নিতকরণ' : 'NER Entity Recognition', color: 'bg-primary' },
    { icon: Database, label: lang === 'bn' ? 'RAG জ্ঞান ভাণ্ডার' : 'RAG Knowledge Base', color: 'bg-urgent' },
    { icon: Activity, label: lang === 'bn' ? 'রোগ শ্রেণীবিভাগ' : 'Disease Classification', color: 'bg-primary' },
    { icon: Stethoscope, label: lang === 'bn' ? 'LLM ক্লিনিক্যাল রিজনিং' : 'LLM Clinical Reasoning', color: 'bg-accent' },
    { icon: Pill, label: lang === 'bn' ? 'ওষুধ পরামর্শ' : 'Medicine Recommendation', color: 'bg-safe' },
  ];

  const techStack = [
    { name: 'Google Gemini', desc: lang === 'bn' ? 'ক্লিনিক্যাল রিজনিং ইঞ্জিন' : 'Clinical reasoning engine' },
    { name: 'BanglaBERT (Simulated)', desc: lang === 'bn' ? 'বাংলা NER সিমুলেশন' : 'Bangla NER simulation' },
    { name: 'XGBoost (Simulated)', desc: lang === 'bn' ? 'রোগ শ্রেণীবিভাগ সিমুলেশন' : 'Disease classification simulation' },
    { name: 'Supabase', desc: lang === 'bn' ? 'ডাটাবেস ও এজ ফাংশন' : 'Database & Edge Functions' },
    { name: 'React + Vite', desc: lang === 'bn' ? 'ফ্রন্টএন্ড ফ্রেমওয়ার্ক' : 'Frontend framework' },
    { name: 'DGDA Database', desc: lang === 'bn' ? '২১,০০০+ ওষুধের তথ্য' : '21,000+ medicine records' },
  ];

  const stats = [
    { value: '170M+', label: lang === 'bn' ? 'বাংলাদেশের জনসংখ্যা' : 'Bangladesh Population' },
    { value: '6.7', label: lang === 'bn' ? 'প্রতি ১০,০০০ জনে চিকিৎসক' : 'Doctors per 10,000' },
    { value: '70%+', label: lang === 'bn' ? 'গ্রামীণ জনগোষ্ঠী' : 'Rural Population' },
    { value: '21K+', label: lang === 'bn' ? 'DGDA ওষুধ' : 'DGDA Medicines' },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-bangla mb-2">
        {lang === 'bn' ? 'HealthMax সম্পর্কে' : 'About HealthMax'}
      </h1>
      <p className="text-muted-foreground font-bangla mb-8">
        {lang === 'bn'
          ? 'হার্ভার্ড HSIL হ্যাকাথন ২০২৬ — বাংলাদেশের গ্রামীণ স্বাস্থ্যসেবার জন্য এআই ট্রায়াজ'
          : 'Harvard HSIL Hackathon 2026 — AI triage for rural healthcare in Bangladesh'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground font-bangla mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Architecture Pipeline */}
      <h2 className="text-xl font-bold font-bangla mb-4">
        {lang === 'bn' ? 'আর্কিটেকচার পাইপলাইন' : 'Architecture Pipeline'}
      </h2>
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {pipelineSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 rounded-xl ${step.color} text-white px-4 py-2.5`}>
              <step.icon className="h-4 w-4" />
              <span className="text-xs font-medium font-bangla whitespace-nowrap">{step.label}</span>
            </div>
            {i < pipelineSteps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <h2 className="text-xl font-bold font-bangla mb-4">
        {lang === 'bn' ? 'প্রযুক্তি স্ট্যাক' : 'Technology Stack'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {techStack.map((tech, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <p className="font-semibold">{tech.name}</p>
              <p className="text-sm text-muted-foreground font-bangla">{tech.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Problem Statement */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-bold font-bangla mb-3">
            {lang === 'bn' ? 'সমস্যা বিবরণ' : 'Problem Statement'}
          </h2>
          <p className="text-sm text-muted-foreground font-bangla leading-relaxed">
            {lang === 'bn'
              ? 'বাংলাদেশে প্রতি ১০,০০০ জনে মাত্র ৬.৭ জন চিকিৎসক আছেন। ৭০% এর বেশি মানুষ গ্রামীণ এলাকায় বাস করেন যেখানে স্বাস্থ্যসেবা সীমিত। HealthMax এআই-চালিত ট্রায়াজ সিস্টেম ব্যবহার করে কমিউনিটি স্বাস্থ্যকর্মীদের (CHWs) সহায়তা করে রোগ নির্ণয়, জরুরি রেফারাল এবং ওষুধ পরামর্শ দিতে — সবকিছু বাংলায়।'
              : 'Bangladesh has only 6.7 doctors per 10,000 people. Over 70% of the population lives in rural areas with limited healthcare access. HealthMax uses an AI-powered triage system to assist Community Health Workers (CHWs) with disease identification, emergency referrals, and medicine recommendations — all in Bangla.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
