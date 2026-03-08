import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import UserDashboard from './UserDashboard';
import ProDashboard from './ProDashboard';

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'healthcare_professional') {
    return <ProDashboard />;
  }

  return <UserDashboard />;
}
