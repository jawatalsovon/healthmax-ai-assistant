import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, CheckCircle, Edit, RefreshCw, Stethoscope, Clock, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch doctor record
  const { data: doctor } = useQuery({
    queryKey: ['doctor-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('registered_doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch pending prescriptions
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['pending-prescriptions', doctor?.id],
    queryFn: async () => {
      if (!doctor) return [];
      // Fetch prescriptions: assigned to this doctor OR unassigned
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .or(`and(status.eq.pending_review,preferred_doctor_id.eq.${doctor.id}),and(status.eq.pending_review,preferred_doctor_id.is.null),and(status.eq.pending_review,doctor_id.eq.${doctor.id}),and(status.eq.under_review,doctor_id.eq.${doctor.id})`)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!doctor?.is_verified,
    refetchInterval: doctor?.is_verified ? 10000 : false,
  });

  const { data: handledCases = [] } = useQuery({
    queryKey: ['doctor-handled-cases', doctor?.id],
    queryFn: async () => {
      if (!doctor?.id) return [];
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('doctor_id', doctor.id)
        .in('status', ['signed', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!doctor?.is_verified,
  });

  // Real-time subscription for new prescriptions
  useEffect(() => {
    if (!doctor) return;
    const channel = supabase
      .channel('doctor-prescriptions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'prescriptions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['pending-prescriptions'] });
        toast({ title: lang === 'bn' ? '🔔 নতুন প্রেসক্রিপশন অনুরোধ!' : '🔔 New prescription request!' });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [doctor]);

  const handleTakeCase = async (rx: any) => {
    if (!doctor) return;

    const updateQuery = supabase
      .from('prescriptions')
      .update({
        doctor_id: doctor.id,
        status: 'under_review',
      })
      .eq('id', rx.id);

    if (rx.doctor_id) {
      updateQuery.eq('doctor_id', doctor.id);
    } else {
      updateQuery.is('doctor_id', null);
    }

    await updateQuery;
    setSelectedPrescription({ ...rx, doctor_id: doctor.id, status: 'under_review' });
    setDoctorNotes('');
    queryClient.invalidateQueries({ queryKey: ['pending-prescriptions'] });
  };

  const handleSign = async (action: 'signed' | 'revised' | 'rejected') => {
    if (!selectedPrescription || !doctor) return;
    setIsSubmitting(true);
    try {
      const updateData: any = {
        status: action === 'revised' ? 'signed' : action,
        doctor_notes: doctorNotes,
        doctor_id: doctor.id,
        signed_at: new Date().toISOString(),
      };
      if (action === 'revised') {
        updateData.doctor_revised_prescription = selectedPrescription.ai_generated_prescription;
        updateData.final_prescription = selectedPrescription.ai_generated_prescription;
      } else if (action === 'signed') {
        updateData.final_prescription = selectedPrescription.ai_generated_prescription;
      }

      const { error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', selectedPrescription.id);

      if (error) throw error;

      toast({
        title: lang === 'bn' ? '✅ প্রেসক্রিপশন আপডেট করা হয়েছে' : '✅ Prescription updated',
      });
      setSelectedPrescription(null);
      queryClient.invalidateQueries({ queryKey: ['pending-prescriptions'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold font-bangla">{lang === 'bn' ? 'ডাক্তার লগইন প্রয়োজন' : 'Doctor Login Required'}</h1>
        <p className="text-muted-foreground font-bangla mt-2">{lang === 'bn' ? 'এই পৃষ্ঠাটি শুধুমাত্র নিবন্ধিত ডাক্তারদের জন্য।' : 'This page is only for registered doctors.'}</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-xl font-bold font-bangla">{lang === 'bn' ? 'ডাক্তার রেজিস্ট্রেশন প্রয়োজন' : 'Doctor Registration Required'}</h1>
        <p className="text-muted-foreground font-bangla mt-2">{lang === 'bn' ? 'অনুগ্রহ করে প্রথমে ডাক্তার হিসেবে নিবন্ধন করুন।' : 'Please register as a doctor first.'}</p>
      </div>
    );
  }

  if (!doctor.is_verified) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Clock className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-xl font-bold font-bangla">{lang === 'bn' ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Waiting for admin approval'}</h1>
        <p className="text-muted-foreground font-bangla mt-2">
          {lang === 'bn'
            ? 'আপনার ডাক্তার আবেদন জমা হয়েছে। অনুমোদন হলে প্রেসক্রিপশন রিভিউ কিউ দেখতে পাবেন।'
            : 'Your doctor registration is submitted. You will see prescription requests after approval.'}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-bangla flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            {lang === 'bn' ? 'ডাক্তার ড্যাশবোর্ড' : 'Doctor Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground font-bangla">
            Dr. {doctor.full_name} — {doctor.specialization || 'General'}
            {doctor.is_verified && <Badge className="ml-2 text-xs" variant="secondary">✓ Verified</Badge>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['pending-prescriptions'] })}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> {lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending prescriptions list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold font-bangla flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {lang === 'bn' ? 'অপেক্ষমাণ প্রেসক্রিপশন' : 'Pending Prescriptions'}
            {prescriptions && <Badge>{prescriptions.length}</Badge>}
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : prescriptions && prescriptions.length > 0 ? (
            prescriptions.map((rx: any) => (
              <Card
                key={rx.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedPrescription?.id === rx.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleTakeCase(rx)}
              >
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <UrgencyBadge level={rx.urgency_level || 'moderate'} />
                    <Badge variant="outline" className="text-xs">
                      {rx.status === 'pending_review' ? (lang === 'bn' ? 'পর্যালোচনা বাকি' : 'Pending') : (lang === 'bn' ? 'পর্যালোচনা চলছে' : 'Under Review')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-bangla line-clamp-2">{rx.patient_symptoms || 'No symptoms recorded'}</p>
                  {rx.diseases && (rx.diseases as any[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(rx.diseases as any[]).slice(0, 3).map((d: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{d.name} ({d.confidence}%)</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8 font-bangla">{lang === 'bn' ? 'কোনো অপেক্ষমাণ প্রেসক্রিপশন নেই' : 'No pending prescriptions'}</p>
          )}
        </div>

        {/* Selected prescription detail */}
        <div>
          {selectedPrescription ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bangla flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {lang === 'bn' ? 'প্রেসক্রিপশন পর্যালোচনা' : 'Prescription Review'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{lang === 'bn' ? 'ট্রায়াজ সারাংশ' : 'Triage Summary'}</p>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <UrgencyBadge level={selectedPrescription.urgency_level || 'moderate'} />
                    <p className="text-sm font-bangla">{selectedPrescription.patient_symptoms}</p>
                    {selectedPrescription.diseases && (selectedPrescription.diseases as any[]).map((d: any, i: number) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span>{d.name}</span>
                        <span className="font-medium">{d.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPrescription.ai_generated_prescription?.medicines && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{lang === 'bn' ? 'AI প্রস্তাবিত ওষুধ' : 'AI Suggested Medicines'}</p>
                    <div className="space-y-1">
                      {(selectedPrescription.ai_generated_prescription.medicines as any[]).map((m: any, i: number) => (
                        <div key={i} className="text-xs bg-muted rounded p-2 flex justify-between">
                          <span>{m.name || m.generic}</span>
                          <span className="text-primary">{m.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{lang === 'bn' ? 'ডাক্তারের মন্তব্য' : "Doctor's Notes"}</p>
                  <Textarea
                    value={doctorNotes}
                    onChange={e => setDoctorNotes(e.target.value)}
                    placeholder={lang === 'bn' ? 'আপনার পর্যবেক্ষণ ও নির্দেশনা লিখুন...' : 'Write your observations and instructions...'}
                    className="font-bangla"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleSign('signed')} disabled={isSubmitting} className="flex-1 font-bangla gap-1">
                    <CheckCircle className="h-4 w-4" /> {lang === 'bn' ? 'অনুমোদন ও স্বাক্ষর' : 'Approve & Sign'}
                  </Button>
                  <Button onClick={() => handleSign('revised')} variant="outline" disabled={isSubmitting} className="font-bangla gap-1">
                    <Edit className="h-4 w-4" /> {lang === 'bn' ? 'সংশোধন' : 'Revise'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-bangla">{lang === 'bn' ? 'বাম দিক থেকে একটি প্রেসক্রিপশন নির্বাচন করুন' : 'Select a prescription from the left'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
