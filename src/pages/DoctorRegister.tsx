import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DoctorRegister() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    bmdc_reg_number: '',
    specialization: '',
    phone: '',
    email: user?.email || '',
    hospital_affiliation: '',
    bio: '',
  });

  const specializations = [
    'General Practitioner', 'Internal Medicine', 'Pediatrics', 'Cardiology',
    'Dermatology', 'ENT', 'Orthopedics', 'Gynecology', 'Neurology',
    'Psychiatry', 'Ophthalmology', 'Surgery', 'Pulmonology', 'Gastroenterology',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: lang === 'bn' ? 'প্রথমে লগইন করুন' : 'Please login first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('registered_doctors').insert({
        user_id: user.id,
        ...form,
      });
      if (error) throw error;
      setSuccess(true);
      toast({ title: lang === 'bn' ? '✅ নিবন্ধন সফল!' : '✅ Registration successful!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="font-bangla text-muted-foreground">{lang === 'bn' ? 'অনুগ্রহ করে প্রথমে লগইন করুন' : 'Please login first'}</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>{lang === 'bn' ? 'লগইন' : 'Login'}</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-12 text-center max-w-md">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold font-bangla mb-2">
          {lang === 'bn' ? 'নিবন্ধন সম্পন্ন!' : 'Registration Complete!'}
        </h1>
        <p className="text-muted-foreground font-bangla mb-4">
          {lang === 'bn'
            ? 'আপনার আবেদন অ্যাডমিন দ্বারা যাচাই করা হবে। যাচাই সম্পন্ন হলে আপনি প্রেসক্রিপশন পর্যালোচনা করতে পারবেন।'
            : 'Your application will be verified by an admin. Once approved, you can start reviewing prescriptions.'}
        </p>
        <Button onClick={() => navigate('/')} className="font-bangla">{lang === 'bn' ? 'হোমে ফিরুন' : 'Go Home'}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-6 w-6" />
          </div>
          <CardTitle className="font-bangla">{lang === 'bn' ? 'ডাক্তার নিবন্ধন' : 'Doctor Registration'}</CardTitle>
          <p className="text-sm text-muted-foreground font-bangla">
            {lang === 'bn' ? 'অ্যাডমিন অনুমোদনের পর আপনি প্রেসক্রিপশন পর্যালোচনা করতে পারবেন।' : 'After admin approval, you can review prescriptions.'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'} *</Label>
              <Input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Dr. ..." className="font-bangla" />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'BMDC রেজিস্ট্রেশন নম্বর' : 'BMDC Registration No.'} *</Label>
              <Input required value={form.bmdc_reg_number} onChange={e => setForm(p => ({ ...p, bmdc_reg_number: e.target.value }))} placeholder="A-12345" />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'বিশেষজ্ঞতা' : 'Specialization'}</Label>
              <Select onValueChange={v => setForm(p => ({ ...p, specialization: v }))}>
                <SelectTrigger className="font-bangla"><SelectValue placeholder={lang === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bangla">{lang === 'bn' ? 'ফোন' : 'Phone'}</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <Label className="font-bangla">{lang === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'হাসপাতাল / ক্লিনিক' : 'Hospital / Clinic'}</Label>
              <Input value={form.hospital_affiliation} onChange={e => setForm(p => ({ ...p, hospital_affiliation: e.target.value }))} className="font-bangla" />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'সংক্ষিপ্ত পরিচিতি' : 'Brief Bio'}</Label>
              <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} className="font-bangla" />
            </div>
            <Button type="submit" className="w-full font-bangla" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Stethoscope className="h-4 w-4 mr-2" />}
              {lang === 'bn' ? 'নিবন্ধন করুন' : 'Register'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
