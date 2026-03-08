import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';

export default function Login() {
  const { lang } = useLanguage();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: lang === 'bn' ? 'লগইন ব্যর্থ' : 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: lang === 'bn' ? 'সফলভাবে লগইন হয়েছে' : 'Login Successful' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="font-bangla text-xl">
            {lang === 'bn' ? 'লগইন করুন' : 'Sign In'}
          </CardTitle>
          <p className="text-sm text-muted-foreground font-bangla">
            {lang === 'bn' ? 'আপনার অ্যাকাউন্টে প্রবেশ করুন' : 'Access your account'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'ইমেইল' : 'Email'}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@example.com" />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full font-bangla" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {lang === 'bn' ? 'লগইন' : 'Sign In'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4 font-bangla">
            {lang === 'bn' ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}
            <Link to="/signup" className="text-primary hover:underline font-semibold">
              {lang === 'bn' ? 'রেজিস্টার করুন' : 'Sign Up'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
