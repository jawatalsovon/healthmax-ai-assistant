import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { BarChart3, Activity, AlertTriangle, Stethoscope, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const URGENCY_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

export default function Dashboard() {
  const { lang } = useLanguage();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['triage-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('triage_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totalSessions = sessions?.length || 0;
  const emergencyCount = sessions?.filter(s => s.urgency_level === 'emergency').length || 0;
  const urgentCount = sessions?.filter(s => s.urgency_level === 'urgent').length || 0;
  const selfCareCount = sessions?.filter(s => s.urgency_level === 'self_care').length || 0;

  const urgencyData = [
    { name: lang === 'bn' ? 'জরুরি' : 'Emergency', value: emergencyCount },
    { name: lang === 'bn' ? 'জরুরি পরামর্শ' : 'Urgent', value: urgentCount },
    { name: lang === 'bn' ? 'স্ব-যত্ন' : 'Self-Care', value: selfCareCount },
    { name: lang === 'bn' ? 'মধ্যম' : 'Moderate', value: totalSessions - emergencyCount - urgentCount - selfCareCount },
  ];

  const statCards = [
    { icon: Activity, label: lang === 'bn' ? 'মোট সেশন' : 'Total Sessions', value: totalSessions, color: 'text-primary' },
    { icon: AlertTriangle, label: lang === 'bn' ? 'জরুরি রেফারাল' : 'Emergency Referrals', value: emergencyCount, color: 'text-emergency' },
    { icon: Stethoscope, label: lang === 'bn' ? 'জরুরি পরামর্শ' : 'Urgent Cases', value: urgentCount, color: 'text-urgent' },
    { icon: BarChart3, label: lang === 'bn' ? 'স্ব-যত্ন' : 'Self-Care', value: selfCareCount, color: 'text-safe' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-bangla mb-6 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'CHW ড্যাশবোর্ড' : 'CHW Dashboard'}
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground font-bangla">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-bangla text-base">
              {lang === 'bn' ? 'জরুরিতা বিতরণ' : 'Urgency Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={urgencyData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {urgencyData.map((_, i) => (
                    <Cell key={i} fill={URGENCY_COLORS[i % URGENCY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bangla text-base">
              {lang === 'bn' ? 'সেশন সংখ্যা' : 'Session Count'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={urgencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(152, 60%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-base">
            {lang === 'bn' ? 'সাম্প্রতিক সেশন' : 'Recent Sessions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.slice(0, 10).map(session => (
                <div key={session.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bangla truncate">{session.symptoms_text}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </div>
                  {session.urgency_level && <UrgencyBadge level={session.urgency_level} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground font-bangla py-6">
              {lang === 'bn' ? 'কোনো সেশন নেই' : 'No sessions yet'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
