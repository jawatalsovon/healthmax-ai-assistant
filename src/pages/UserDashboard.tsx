import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { User, Phone, Heart, Clock, Stethoscope, Loader2, Save, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editProfile, setEditProfile] = useState({
    full_name: '',
    phone: '',
    age: '',
    gender: '',
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
  });

  // Fetch patient profile
  const { data: patientProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch triage history
  const { data: triageHistory } = useQuery({
    queryKey: ['user-triage-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('triage_sessions')
        .select('*')
        .eq('session_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ['user-prescriptions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('prescriptions')
        .select('*, registered_doctors:doctor_id(full_name, specialization)')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (patientProfile) {
      setEditProfile({
        full_name: patientProfile.full_name || profile?.full_name || '',
        phone: patientProfile.phone || '',
        age: patientProfile.age?.toString() || '',
        gender: patientProfile.gender || '',
        blood_group: patientProfile.blood_group || '',
        allergies: patientProfile.allergies?.join(', ') || '',
        chronic_conditions: patientProfile.chronic_conditions?.join(', ') || '',
        emergency_contact_name: patientProfile.emergency_contact_name || '',
        emergency_contact_phone: patientProfile.emergency_contact_phone || '',
        address: patientProfile.address || '',
      });
    } else if (profile) {
      setEditProfile(prev => ({ ...prev, full_name: profile.full_name || '' }));
    }
  }, [patientProfile, profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      const payload = {
        user_id: user.id,
        full_name: editProfile.full_name || null,
        phone: editProfile.phone || null,
        age: editProfile.age ? parseInt(editProfile.age) : null,
        gender: editProfile.gender || null,
        blood_group: editProfile.blood_group || null,
        allergies: editProfile.allergies ? editProfile.allergies.split(',').map(s => s.trim()).filter(Boolean) : null,
        chronic_conditions: editProfile.chronic_conditions ? editProfile.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : null,
        emergency_contact_name: editProfile.emergency_contact_name || null,
        emergency_contact_phone: editProfile.emergency_contact_phone || null,
        address: editProfile.address || null,
      };

      if (patientProfile) {
        const { error } = await supabase.from('patient_profiles').update(payload).eq('id', patientProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('patient_profiles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-profile'] });
      toast({ title: lang === 'bn' ? 'প্রোফাইল সংরক্ষিত' : 'Profile saved' });
    },
    onError: (err: any) => {
      toast({ title: lang === 'bn' ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2 font-bangla">
          {lang === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}
        </h2>
        <Button onClick={() => navigate('/login')}>{lang === 'bn' ? 'লগইন' : 'Login'}</Button>
      </div>
    );
  }

  if (profileLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold font-bangla flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'আমার ড্যাশবোর্ড' : 'My Dashboard'}
      </h1>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            {lang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
          </CardTitle>
          <CardDescription className="font-bangla">
            {lang === 'bn' ? 'আপনার স্বাস্থ্য তথ্য আপডেট করুন' : 'Update your health information for better triage'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}</Label>
              <Input value={editProfile.full_name} onChange={e => setEditProfile(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'ফোন' : 'Phone'}</Label>
              <Input value={editProfile.phone} onChange={e => setEditProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'বয়স' : 'Age'}</Label>
              <Input type="number" value={editProfile.age} onChange={e => setEditProfile(p => ({ ...p, age: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'লিঙ্গ' : 'Gender'}</Label>
              <Input value={editProfile.gender} placeholder={lang === 'bn' ? 'পুরুষ/মহিলা/অন্যান্য' : 'Male/Female/Other'} onChange={e => setEditProfile(p => ({ ...p, gender: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'রক্তের গ্রুপ' : 'Blood Group'}</Label>
              <Input value={editProfile.blood_group} placeholder="A+, B-, O+..." onChange={e => setEditProfile(p => ({ ...p, blood_group: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'ঠিকানা' : 'Address'}</Label>
              <Input value={editProfile.address} onChange={e => setEditProfile(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="font-bangla">{lang === 'bn' ? 'এলার্জি (কমা দিয়ে আলাদা)' : 'Allergies (comma separated)'}</Label>
              <Input value={editProfile.allergies} onChange={e => setEditProfile(p => ({ ...p, allergies: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="font-bangla">{lang === 'bn' ? 'দীর্ঘস্থায়ী রোগ (কমা দিয়ে আলাদা)' : 'Chronic Conditions (comma separated)'}</Label>
              <Input value={editProfile.chronic_conditions} onChange={e => setEditProfile(p => ({ ...p, chronic_conditions: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'জরুরি যোগাযোগ নাম' : 'Emergency Contact Name'}</Label>
              <Input value={editProfile.emergency_contact_name} onChange={e => setEditProfile(p => ({ ...p, emergency_contact_name: e.target.value }))} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'জরুরি যোগাযোগ ফোন' : 'Emergency Contact Phone'}</Label>
              <Input value={editProfile.emergency_contact_phone} onChange={e => setEditProfile(p => ({ ...p, emergency_contact_phone: e.target.value }))} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Triage History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {lang === 'bn' ? 'ট্রায়াজ ইতিহাস' : 'Triage History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {triageHistory && triageHistory.length > 0 ? (
            <div className="space-y-3">
              {triageHistory.map(s => (
                <div key={s.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bangla truncate">{s.symptoms_text}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                  </div>
                  {s.urgency_level && <UrgencyBadge level={s.urgency_level} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground font-bangla py-4">
              {lang === 'bn' ? 'কোনো ট্রায়াজ ইতিহাস নেই' : 'No triage history yet'}
            </p>
          )}
          <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/triage')}>
            <Stethoscope className="h-4 w-4 mr-2" />
            {lang === 'bn' ? 'নতুন ট্রায়াজ শুরু করুন' : 'Start New Triage'}
          </Button>
        </CardContent>
      </Card>

      {/* Prescriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {lang === 'bn' ? 'প্রেসক্রিপশন' : 'My Prescriptions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions && prescriptions.length > 0 ? (
            <div className="space-y-3">
              {prescriptions.map(rx => (
                <div key={rx.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={rx.status === 'signed' ? 'default' : 'secondary'}>{rx.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleDateString()}</span>
                  </div>
                  {rx.patient_symptoms && <p className="text-sm font-bangla truncate">{rx.patient_symptoms}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground font-bangla py-4">
              {lang === 'bn' ? 'কোনো প্রেসক্রিপশন নেই' : 'No prescriptions yet'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
