import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Stethoscope, User } from 'lucide-react';

const SPECIALIZATIONS = [
  'General Practitioner', 'Internal Medicine', 'Pediatrics', 'Cardiology',
  'Dermatology', 'ENT', 'Orthopedics', 'Gynecology', 'Neurology',
  'Psychiatry', 'Ophthalmology', 'Surgery', 'Pulmonology', 'Gastroenterology',
];

export default function Signup() {
  const { lang } = useLanguage();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<'healthcare_professional' | 'regular_user'>('regular_user');
  const [loading, setLoading] = useState(false);

  // Doctor registration fields
  const [wantsDoctorReg, setWantsDoctorReg] = useState(false);
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [bio, setBio] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (wantsDoctorReg && !bmdcNumber.trim()) {
      toast({ title: lang === 'bn' ? 'BMDC নম্বর আবশ্যক' : 'BMDC registration number is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const effectiveRole = wantsDoctorReg ? 'healthcare_professional' : role;
    const { error } = await signUp(email, password, fullName, effectiveRole as any, organization, {
      doctor_registration: wantsDoctorReg
        ? {
            requested: true,
            bmdc_reg_number: bmdcNumber,
            specialization: specialization || undefined,
            phone: phone || undefined,
            email,
            hospital_affiliation: hospitalAffiliation || undefined,
            bio: bio || undefined,
          }
        : undefined,
    });

    if (error) {
      toast({ title: lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ' : 'Signup Failed', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setLoading(false);
    toast({
      title: lang === 'bn'
        ? wantsDoctorReg
          ? 'রেজিস্ট্রেশন সফল! ইমেইল ভেরিফাই করে লগইন করলে আপনার ডাক্তার আবেদন অ্যাডমিন প্যানেলে যাবে।'
          : 'রেজিস্ট্রেশন সফল! ইমেইল যাচাই করুন।'
        : wantsDoctorReg
          ? 'Signup successful! After email verification and first login, your doctor request will appear in admin pending list.'
          : 'Signup successful! Please verify your email.',
    });
    navigate('/login');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="font-bangla text-xl">
            {lang === 'bn' ? 'রেজিস্টার করুন' : 'Create Account'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'পুরো নাম' : 'Full Name'}</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder={lang === 'bn' ? 'আপনার নাম' : 'Your name'} />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'ইমেইল' : 'Email'}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@example.com" />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>

            <div>
              <Label className="font-bangla mb-3 block">{lang === 'bn' ? 'আপনার ভূমিকা' : 'Your Role'}</Label>
              <RadioGroup value={role} onValueChange={(v) => { setRole(v as typeof role); if (v === 'regular_user') setWantsDoctorReg(false); }} className="grid grid-cols-2 gap-3">
                <Label
                  htmlFor="regular"
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors ${role === 'regular_user' && !wantsDoctorReg ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <RadioGroupItem value="regular_user" id="regular" className="sr-only" />
                  <User className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium font-bangla">{lang === 'bn' ? 'সাধারণ ব্যবহারকারী' : 'Regular User'}</span>
                  <span className="text-xs text-muted-foreground font-bangla text-center">{lang === 'bn' ? 'রোগী বা পরিবার' : 'Patient or Family'}</span>
                </Label>
                <Label
                  htmlFor="healthcare"
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors ${role === 'healthcare_professional' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <RadioGroupItem value="healthcare_professional" id="healthcare" className="sr-only" />
                  <Stethoscope className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium font-bangla">{lang === 'bn' ? 'স্বাস্থ্যকর্মী' : 'Healthcare Pro'}</span>
                  <span className="text-xs text-muted-foreground font-bangla text-center">{lang === 'bn' ? 'CHW / ডাক্তার / নার্স' : 'CHW / Doctor / Nurse'}</span>
                </Label>
              </RadioGroup>
            </div>

            {role === 'healthcare_professional' && (
              <>
                <div>
                  <Label className="font-bangla">{lang === 'bn' ? 'প্রতিষ্ঠান (ঐচ্ছিক)' : 'Organization (optional)'}</Label>
                  <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder={lang === 'bn' ? 'হাসপাতাল / ক্লিনিক নাম' : 'Hospital / Clinic name'} />
                </div>

                {/* Doctor Registration Option */}
                <Separator />
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantsDoctorReg}
                      onChange={e => setWantsDoctorReg(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm font-medium font-bangla">
                      {lang === 'bn' ? '🩺 নিবন্ধিত ডাক্তার হিসেবে আবেদন করুন' : '🩺 Register as a verified doctor'}
                    </span>
                  </label>
                  {wantsDoctorReg && (
                    <Card className="border-dashed border-primary/30">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground font-bangla">
                          {lang === 'bn'
                            ? 'অ্যাডমিন অনুমোদনের পর আপনি প্রেসক্রিপশন পর্যালোচনা করতে পারবেন।'
                            : 'After admin approval, you can review and sign prescriptions.'}
                        </p>
                        <div>
                          <Label className="font-bangla text-xs">{lang === 'bn' ? 'BMDC রেজিস্ট্রেশন নম্বর *' : 'BMDC Registration No. *'}</Label>
                          <Input value={bmdcNumber} onChange={e => setBmdcNumber(e.target.value)} placeholder="A-12345" required={wantsDoctorReg} />
                        </div>
                        <div>
                          <Label className="font-bangla text-xs">{lang === 'bn' ? 'বিশেষজ্ঞতা' : 'Specialization'}</Label>
                          <Select onValueChange={setSpecialization}>
                            <SelectTrigger className="font-bangla"><SelectValue placeholder={lang === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                            <SelectContent>
                              {SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="font-bangla text-xs">{lang === 'bn' ? 'ফোন' : 'Phone'}</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                          </div>
                          <div>
                            <Label className="font-bangla text-xs">{lang === 'bn' ? 'হাসপাতাল' : 'Hospital'}</Label>
                            <Input value={hospitalAffiliation} onChange={e => setHospitalAffiliation(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <Label className="font-bangla text-xs">{lang === 'bn' ? 'সংক্ষিপ্ত পরিচিতি' : 'Brief Bio'}</Label>
                          <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="font-bangla" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            <Button type="submit" className="w-full font-bangla" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {lang === 'bn' ? 'রেজিস্টার করুন' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4 font-bangla">
            {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              {lang === 'bn' ? 'লগইন করুন' : 'Sign In'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
