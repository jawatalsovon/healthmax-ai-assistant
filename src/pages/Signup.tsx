import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Stethoscope, User } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role, organization);
    setLoading(false);

    if (error) {
      toast({ title: lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ' : 'Signup Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: lang === 'bn' ? 'রেজিস্ট্রেশন সফল! ইমেইল যাচাই করুন।' : 'Signup successful! Please verify your email.' });
      navigate('/login');
    }
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
              <RadioGroup value={role} onValueChange={(v) => setRole(v as typeof role)} className="grid grid-cols-2 gap-3">
                <Label
                  htmlFor="regular"
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors ${role === 'regular_user' ? 'border-primary bg-primary/5' : 'border-border'}`}
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
              <div>
                <Label className="font-bangla">{lang === 'bn' ? 'প্রতিষ্ঠান (ঐচ্ছিক)' : 'Organization (optional)'}</Label>
                <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder={lang === 'bn' ? 'হাসপাতাল / ক্লিনিক নাম' : 'Hospital / Clinic name'} />
              </div>
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
