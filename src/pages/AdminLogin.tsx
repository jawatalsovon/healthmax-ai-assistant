import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const { lang } = useLanguage();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, redirect to panel
  if (user && role === 'admin') {
    navigate('/admin/panel');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: lang === 'bn' ? 'লগইন ব্যর্থ' : 'Login Failed', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    if (roleData?.role !== 'admin') {
      await supabase.auth.signOut();
      toast({
        title: lang === 'bn' ? 'অননুমোদিত' : 'Unauthorized',
        description: lang === 'bn' ? 'আপনার অ্যাডমিন অ্যাক্সেস নেই' : 'You do not have admin access',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    toast({ title: lang === 'bn' ? '✅ অ্যাডমিন লগইন সফল!' : '✅ Admin login successful!' });
    navigate('/admin/panel');
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Shield className="h-7 w-7" />
          </div>
          <CardTitle className="font-bangla text-xl">
            {lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Login'}
          </CardTitle>
          <p className="text-sm text-muted-foreground font-bangla">
            {lang === 'bn' ? 'অ্যাডমিন প্যানেলে প্রবেশ করুন' : 'Access the admin panel'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'ইমেইল' : 'Email'}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@healthmax.app" />
            </div>
            <div>
              <Label className="font-bangla">{lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full font-bangla" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              {lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
