import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { BarChart3, Activity, AlertTriangle, Stethoscope, Loader2, Database, Upload, Pill, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const URGENCY_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

export default function ProDashboard() {
  const { lang } = useLanguage();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reimporting, setReimporting] = useState(false);

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

  const { data: stats } = useQuery({
    queryKey: ['pro-dashboard-stats'],
    queryFn: async () => {
      const [medCount, nerCount, specCount, matrixCount, doctorCount, rxCount] = await Promise.all([
        supabase.from('medicines').select('*', { count: 'exact', head: true }),
        supabase.from('medicine_ner').select('*', { count: 'exact', head: true }),
        supabase.from('specialist_classifications').select('*', { count: 'exact', head: true }),
        supabase.from('symptom_disease_matrix').select('*', { count: 'exact', head: true }),
        supabase.from('registered_doctors').select('*', { count: 'exact', head: true }),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }),
      ]);
      return {
        medicines: medCount.count || 0,
        ner: nerCount.count || 0,
        specialists: specCount.count || 0,
        matrix: matrixCount.count || 0,
        doctors: doctorCount.count || 0,
        prescriptions: rxCount.count || 0,
      };
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">{lang === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}</h2>
        <Button onClick={() => navigate('/login')}>{lang === 'bn' ? 'লগইন' : 'Login'}</Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const handleReimport = async () => {
    setReimporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('medicine-import', {
        body: { clear_existing: true, source_url: `${window.location.origin}/data/medicine.csv`, offset: 0, chunk_size: 5000 },
      });
      if (error) throw error;

      // Import remaining chunks
      const totalLines = data.total_lines || 0;
      for (let offset = 5000; offset < totalLines; offset += 5000) {
        await supabase.functions.invoke('medicine-import', {
          body: { source_url: `${window.location.origin}/data/medicine.csv`, offset, chunk_size: 5000 },
        });
      }

      queryClient.invalidateQueries({ queryKey: ['pro-dashboard-stats'] });
      toast({ title: lang === 'bn' ? 'ওষুধ পুনরায় আমদানি সম্পন্ন' : `Reimported ${totalLines} medicines` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setReimporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-bangla flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          {lang === 'bn' ? 'প্রফেশনাল ড্যাশবোর্ড' : 'Professional Dashboard'}
        </h1>
        <Badge variant="secondary">{lang === 'bn' ? 'স্বাস্থ্যসেবা পেশাদার' : 'Healthcare Professional'}</Badge>
      </div>

      {/* Triage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: lang === 'bn' ? 'মোট সেশন' : 'Total Sessions', value: totalSessions, color: 'text-primary' },
          { icon: AlertTriangle, label: lang === 'bn' ? 'জরুরি' : 'Emergency', value: emergencyCount, color: 'text-destructive' },
          { icon: Stethoscope, label: lang === 'bn' ? 'জরুরি পরামর্শ' : 'Urgent', value: urgentCount, color: 'text-orange-500' },
          { icon: BarChart3, label: lang === 'bn' ? 'স্ব-যত্ন' : 'Self-Care', value: selfCareCount, color: 'text-green-500' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground font-bangla">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {lang === 'bn' ? 'ডেটা ব্যবস্থাপনা' : 'Data Management'}
          </CardTitle>
          <CardDescription className="font-bangla">
            {lang === 'bn' ? 'ডেটাবেস ডেটাসেট এবং রেকর্ড' : 'Database datasets and records overview'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: lang === 'bn' ? 'ওষুধ' : 'Medicines', value: stats?.medicines || 0, icon: Pill },
              { label: lang === 'bn' ? 'NER রেকর্ড' : 'NER Records', value: stats?.ner || 0, icon: Database },
              { label: lang === 'bn' ? 'বিশেষজ্ঞ শ্রেণীবিভাগ' : 'Specialist Rules', value: stats?.specialists || 0, icon: Stethoscope },
              { label: lang === 'bn' ? 'রোগ ম্যাট্রিক্স' : 'Disease Matrix', value: stats?.matrix || 0, icon: Activity },
              { label: lang === 'bn' ? 'নিবন্ধিত ডাক্তার' : 'Registered Doctors', value: stats?.doctors || 0, icon: Users },
              { label: lang === 'bn' ? 'প্রেসক্রিপশন' : 'Prescriptions', value: stats?.prescriptions || 0, icon: BarChart3 },
            ].map((item, i) => (
              <div key={i} className="border rounded-lg p-3 text-center">
                <item.icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{item.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground font-bangla">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/import')}>
              <Upload className="h-4 w-4 mr-1" />
              {lang === 'bn' ? 'CSV আমদানি' : 'Import CSV Data'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReimport} disabled={reimporting}>
              {reimporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {lang === 'bn' ? 'ওষুধ পুনরায় আমদানি' : 'Reimport All Medicines'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bangla text-base">{lang === 'bn' ? 'জরুরিতা বিতরণ' : 'Urgency Distribution'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={urgencyData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {urgencyData.map((_, i) => <Cell key={i} fill={URGENCY_COLORS[i % URGENCY_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-bangla text-base">{lang === 'bn' ? 'সেশন সংখ্যা' : 'Session Count'}</CardTitle>
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

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-base">{lang === 'bn' ? 'সাম্প্রতিক সেশন' : 'Recent Triage Sessions'}</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.slice(0, 10).map(session => (
                <div key={session.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bangla truncate">{session.symptoms_text}</p>
                    <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                  </div>
                  {session.urgency_level && <UrgencyBadge level={session.urgency_level} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground font-bangla py-4">{lang === 'bn' ? 'কোনো সেশন নেই' : 'No sessions yet'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
