import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, Database, BarChart3, Stethoscope, Users, Pill, Activity,
  CheckCircle, XCircle, Loader2, FileText, Clock, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const CHART_COLORS = ['hsl(350, 70%, 55%)', 'hsl(340, 65%, 47%)', 'hsl(38, 92%, 50%)', 'hsl(152, 60%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(220, 60%, 50%)'];

export default function AdminPanel() {
  const { user, role, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();

  const [stats, setStats] = useState({ users: 0, doctors: 0, medicines: 0, triageSessions: 0, prescriptions: 0, pendingDoctors: 0 });
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [urgencyData, setUrgencyData] = useState<any[]>([]);
  const [dailySessions, setDailySessions] = useState<any[]>([]);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [activeTable, setActiveTable] = useState('profiles');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (user && role === 'admin') {
      loadDashboardData();
    }
  }, [user, role]);

  const loadDashboardData = async () => {
    const [
      { count: usersCount },
      { count: doctorsCount },
      { count: medsCount },
      { count: triageCount },
      { count: rxCount },
      { data: pending },
      { data: sessions },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('registered_doctors').select('*', { count: 'exact', head: true }),
      supabase.from('medicines').select('*', { count: 'exact', head: true }),
      supabase.from('triage_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('prescriptions').select('*', { count: 'exact', head: true }),
      supabase.from('registered_doctors').select('*').eq('is_verified', false).order('created_at', { ascending: false }),
      supabase.from('triage_sessions').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    setStats({
      users: usersCount || 0,
      doctors: doctorsCount || 0,
      medicines: medsCount || 0,
      triageSessions: triageCount || 0,
      prescriptions: rxCount || 0,
      pendingDoctors: pending?.length || 0,
    });

    setPendingDoctors(pending || []);
    setRecentSessions(sessions || []);

    // Urgency distribution
    const urgencyMap: Record<string, number> = {};
    (sessions || []).forEach((s: any) => {
      const level = s.urgency_level || 'unknown';
      urgencyMap[level] = (urgencyMap[level] || 0) + 1;
    });
    setUrgencyData(Object.entries(urgencyMap).map(([name, value]) => ({ name, value })));

    // Daily sessions (last 7 days)
    const dayMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().split('T')[0]] = 0;
    }
    (sessions || []).forEach((s: any) => {
      const day = s.created_at?.split('T')[0];
      if (day && dayMap[day] !== undefined) dayMap[day]++;
    });
    setDailySessions(Object.entries(dayMap).map(([date, count]) => ({ date: date.slice(5), count })));
  };

  const loadTableData = async (tableName: string) => {
    setActiveTable(tableName);
    const { data } = await supabase.from(tableName as any).select('*').limit(100).order('created_at', { ascending: false });
    setTableData(prev => ({ ...prev, [tableName]: data || [] }));
  };

  const handleApproveDoctor = async (doctorId: string, email: string) => {
    setLoadingAction(doctorId);
    const { error } = await supabase
      .from('registered_doctors')
      .update({ is_verified: true, verified_by: user?.id, verified_at: new Date().toISOString() })
      .eq('id', doctorId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: lang === 'bn' ? '✅ ডাক্তার অনুমোদিত!' : '✅ Doctor approved!' });
      // Send confirmation notification (email is handled by the system)
      setPendingDoctors(prev => prev.filter(d => d.id !== doctorId));
      setStats(prev => ({ ...prev, pendingDoctors: prev.pendingDoctors - 1 }));
    }
    setLoadingAction(null);
  };

  const handleRejectDoctor = async (doctorId: string) => {
    setLoadingAction(doctorId + '_reject');
    const { error } = await supabase
      .from('registered_doctors')
      .delete()
      .eq('id', doctorId);

    if (!error) {
      toast({ title: lang === 'bn' ? 'নিবন্ধন প্রত্যাখ্যাত' : 'Registration rejected' });
      setPendingDoctors(prev => prev.filter(d => d.id !== doctorId));
      setStats(prev => ({ ...prev, pendingDoctors: prev.pendingDoctors - 1 }));
    }
    setLoadingAction(null);
  };

  if (authLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/admin" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;

  const statCards = [
    { label: lang === 'bn' ? 'মোট ব্যবহারকারী' : 'Total Users', value: stats.users, icon: Users, color: 'text-primary' },
    { label: lang === 'bn' ? 'নিবন্ধিত ডাক্তার' : 'Registered Doctors', value: stats.doctors, icon: Stethoscope, color: 'text-accent' },
    { label: lang === 'bn' ? 'ওষুধ' : 'Medicines', value: stats.medicines, icon: Pill, color: 'text-primary' },
    { label: lang === 'bn' ? 'ট্রায়াজ সেশন' : 'Triage Sessions', value: stats.triageSessions, icon: Activity, color: 'text-accent' },
    { label: lang === 'bn' ? 'প্রেসক্রিপশন' : 'Prescriptions', value: stats.prescriptions, icon: FileText, color: 'text-primary' },
    { label: lang === 'bn' ? 'অপেক্ষমান ডাক্তার' : 'Pending Doctors', value: stats.pendingDoctors, icon: Clock, color: stats.pendingDoctors > 0 ? 'text-destructive' : 'text-muted-foreground' },
  ];

  const tables = ['profiles', 'registered_doctors', 'user_roles', 'triage_sessions', 'prescriptions', 'medicines', 'symptoms_diseases', 'clinical_rules'];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-bangla">{lang === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}</h1>
          <p className="text-sm text-muted-foreground font-bangla">{lang === 'bn' ? 'সিস্টেম ব্যবস্থাপনা ও বিশ্লেষণ' : 'System management & analytics'}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <s.icon className={`h-6 w-6 mx-auto mb-1 ${s.color}`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground font-bangla">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="doctors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="doctors" className="font-bangla">
            <Stethoscope className="h-4 w-4 mr-1" />
            {lang === 'bn' ? 'ডাক্তার অনুমোদন' : 'Doctor Approval'}
            {stats.pendingDoctors > 0 && <Badge variant="destructive" className="ml-1 text-xs">{stats.pendingDoctors}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="font-bangla">
            <BarChart3 className="h-4 w-4 mr-1" />
            {lang === 'bn' ? 'বিশ্লেষণ' : 'Analytics'}
          </TabsTrigger>
          <TabsTrigger value="database" className="font-bangla">
            <Database className="h-4 w-4 mr-1" />
            {lang === 'bn' ? 'ডাটাবেস' : 'Database'}
          </TabsTrigger>
        </TabsList>

        {/* Doctor Approval Tab */}
        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-bangla text-lg">
                {lang === 'bn' ? 'অপেক্ষমান ডাক্তার নিবন্ধন' : 'Pending Doctor Registrations'}
              </CardTitle>
              <CardDescription className="font-bangla">
                {lang === 'bn' ? 'ডাক্তারদের নিবন্ধন অনুমোদন বা প্রত্যাখ্যান করুন' : 'Approve or reject doctor registrations'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDoctors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-bangla">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-primary/30" />
                  {lang === 'bn' ? 'কোন অপেক্ষমান নিবন্ধন নেই' : 'No pending registrations'}
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDoctors.map(doc => (
                    <Card key={doc.id} className="border-2 border-dashed border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="font-semibold text-lg">{doc.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">BMDC:</span> {doc.bmdc_reg_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">{lang === 'bn' ? 'বিশেষজ্ঞতা:' : 'Specialization:'}</span> {doc.specialization || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">{lang === 'bn' ? 'হাসপাতাল:' : 'Hospital:'}</span> {doc.hospital_affiliation || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">{lang === 'bn' ? 'ইমেইল:' : 'Email:'}</span> {doc.email || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">{lang === 'bn' ? 'ফোন:' : 'Phone:'}</span> {doc.phone || 'N/A'}
                            </div>
                            {doc.bio && <div className="text-sm text-muted-foreground italic">"{doc.bio}"</div>}
                            <div className="text-xs text-muted-foreground">
                              {lang === 'bn' ? 'আবেদনের তারিখ:' : 'Applied:'} {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDoctor(doc.id, doc.email)}
                              disabled={loadingAction === doc.id}
                            >
                              {loadingAction === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                              {lang === 'bn' ? 'অনুমোদন' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDoctor(doc.id)}
                              disabled={loadingAction === doc.id + '_reject'}
                            >
                              {loadingAction === doc.id + '_reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                              {lang === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bangla">{lang === 'bn' ? 'দৈনিক ট্রায়াজ সেশন (৭ দিন)' : 'Daily Triage Sessions (7 days)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailySessions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(350, 70%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bangla">{lang === 'bn' ? 'জরুরিতা বিতরণ' : 'Urgency Distribution'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={urgencyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {urgencyData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bangla">{lang === 'bn' ? 'সাম্প্রতিক ট্রায়াজ সেশন' : 'Recent Triage Sessions'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bangla">{lang === 'bn' ? 'তারিখ' : 'Date'}</TableHead>
                      <TableHead className="font-bangla">{lang === 'bn' ? 'লক্ষণ' : 'Symptoms'}</TableHead>
                      <TableHead className="font-bangla">{lang === 'bn' ? 'জরুরিতা' : 'Urgency'}</TableHead>
                      <TableHead className="font-bangla">{lang === 'bn' ? 'ভাষা' : 'Language'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSessions.slice(0, 15).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{new Date(s.created_at).toLocaleString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-bangla">{s.symptoms_text}</TableCell>
                        <TableCell>
                          <Badge variant={s.urgency_level === 'emergency' ? 'destructive' : 'secondary'} className="text-xs">
                            {s.urgency_level || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{s.language}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {tables.map(t => (
              <Button
                key={t}
                variant={activeTable === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadTableData(t)}
                className="text-xs"
              >
                {t}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                {activeTable}
                {tableData[activeTable] && <Badge variant="secondary" className="text-xs">{tableData[activeTable].length} rows</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!tableData[activeTable] ? (
                <div className="text-center py-8 text-muted-foreground font-bangla">
                  {lang === 'bn' ? 'টেবিল নির্বাচন করে ডেটা লোড করুন' : 'Click a table above to load data'}
                </div>
              ) : tableData[activeTable].length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{lang === 'bn' ? 'কোন ডেটা নেই' : 'No data'}</div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(tableData[activeTable][0]).slice(0, 8).map(col => (
                          <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData[activeTable].map((row: any, i: number) => (
                        <TableRow key={i}>
                          {Object.values(row).slice(0, 8).map((val: any, j: number) => (
                            <TableCell key={j} className="text-xs max-w-[200px] truncate">
                              {typeof val === 'object' ? JSON.stringify(val)?.slice(0, 50) : String(val ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
