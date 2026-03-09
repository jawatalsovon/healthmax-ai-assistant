import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import UserDashboard from './UserDashboard';
import ProDashboard from './ProDashboard';
import DoctorDashboard from './DoctorDashboard';
import AdminPanel from './AdminPanel';

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  const { data: doctorRecord, isLoading: doctorLoading } = useQuery({
    queryKey: ['dashboard-doctor-record', user?.id],
    queryFn: async () => {
      if (!user || role !== 'healthcare_professional') return null;
      const { data } = await supabase
        .from('registered_doctors')
        .select('id, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && role === 'healthcare_professional',
  });

  if (loading || doctorLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <AdminPanel />;
  }

  if (role === 'healthcare_professional') {
    return doctorRecord?.is_verified ? <DoctorDashboard /> : <ProDashboard />;
  }

  return <UserDashboard />;
}
