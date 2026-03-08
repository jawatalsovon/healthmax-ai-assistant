import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Search, Shield, Stethoscope, Users, Zap } from 'lucide-react';

export default function Index() {
  const { t, lang } = useLanguage();

  const features = [
    {
      icon: Stethoscope,
      title: lang === 'bn' ? 'এআই ট্রায়াজ' : 'AI Triage',
      desc: lang === 'bn' ? 'লক্ষণ বিশ্লেষণ করে সম্ভাব্য রোগ নির্ণয়' : 'Analyze symptoms to identify probable conditions',
    },
    {
      icon: Shield,
      title: lang === 'bn' ? 'নিরাপত্তা গার্ড' : 'Safety Guard',
      desc: lang === 'bn' ? 'জরুরি লক্ষণ সনাক্তে তাৎক্ষণিক রেফারাল' : 'Immediate referral for emergency symptoms',
    },
    {
      icon: Search,
      title: lang === 'bn' ? 'ওষুধ অনুসন্ধান' : 'Medicine Search',
      desc: lang === 'bn' ? '২১,০০০+ DGDA ওষুধের তথ্য ও মূল্য' : '21,000+ DGDA medicines with pricing',
    },
    {
      icon: Users,
      title: lang === 'bn' ? 'CHW ড্যাশবোর্ড' : 'CHW Dashboard',
      desc: lang === 'bn' ? 'কমিউনিটি স্বাস্থ্যকর্মীদের জন্য বিশ্লেষণ' : 'Analytics for Community Health Workers',
    },
    {
      icon: Zap,
      title: lang === 'bn' ? 'দ্রুত ও নির্ভুল' : 'Fast & Accurate',
      desc: lang === 'bn' ? 'Gemini AI দিয়ে চালিত ক্লিনিক্যাল রিজনিং' : 'Clinical reasoning powered by Gemini AI',
    },
    {
      icon: Activity,
      title: lang === 'bn' ? 'বাংলা সাপোর্ট' : 'Bangla Support',
      desc: lang === 'bn' ? 'সম্পূর্ণ বাংলায় লক্ষণ ইনপুট ও ফলাফল' : 'Full Bangla symptom input and results',
    },
  ];

  const stats = [t('heroStat1'), t('heroStat2'), t('heroStat3')];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Activity className="h-4 w-4" />
              {lang === 'bn' ? 'হার্ভার্ড HSIL হ্যাকাথন ২০২৬' : 'Harvard HSIL Hackathon 2026'}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-bangla leading-tight">
              <span className="text-gradient-primary">{t('appName')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-bangla">
              {t('appTagline')}
            </p>
            <p className="text-sm text-muted-foreground font-bangla max-w-xl mx-auto">
              {lang === 'bn'
                ? 'বাংলাদেশের গ্রামীণ জনগোষ্ঠীর জন্য এআই-চালিত স্বাস্থ্য ট্রায়াজ — লক্ষণ থেকে রোগ নির্ণয়, ওষুধ পরামর্শ এবং জরুরি রেফারাল।'
                : 'AI-powered health triage for rural Bangladesh — from symptoms to diagnosis, medicine suggestions, and emergency referrals.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/triage">
                <Button size="lg" className="gap-2 font-bangla text-base animate-pulse-glow">
                  <Stethoscope className="h-5 w-5" />
                  {t('startTriage')}
                </Button>
              </Link>
              <Link to="/medicines">
                <Button size="lg" variant="outline" className="gap-2 font-bangla text-base">
                  <Search className="h-5 w-5" />
                  {t('medicinSearch')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="text-center font-bangla">
                <p className="text-2xl font-bold text-primary">{stat.split(' ')[0]}</p>
                <p className="text-sm text-muted-foreground">{stat.split(' ').slice(1).join(' ')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center font-bangla mb-10">
            {lang === 'bn' ? 'বৈশিষ্ট্যসমূহ' : 'Features'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="group hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg font-bangla mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground font-bangla">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold font-bangla mb-4">
            {lang === 'bn' ? 'এখনই শুরু করুন' : 'Get Started Now'}
          </h2>
          <p className="text-muted-foreground font-bangla mb-6 max-w-md mx-auto">
            {lang === 'bn'
              ? 'আপনার লক্ষণ লিখুন বা বলুন — HealthMax আপনাকে সঠিক পরামর্শ দেবে।'
              : 'Type or speak your symptoms — HealthMax will guide you to the right care.'}
          </p>
          <Link to="/triage">
            <Button size="lg" className="font-bangla">{t('startTriage')}</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
