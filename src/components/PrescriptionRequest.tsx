import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TriageResult, PatientInfo } from '@/types/triage';
interface Props {
  sessionId: string;
  triageResult: TriageResult;
  patientInfo: PatientInfo | null;
  lang: 'bn' | 'en';
}

export function PrescriptionRequest({ sessionId, triageResult, patientInfo, lang }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'requesting' | 'pending' | 'signed' | 'error'>('idle');
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('any');

  useEffect(() => {
    supabase.from('registered_doctors')
      .select('id, full_name, specialization')
      .eq('is_verified', true)
      .eq('is_available', true)
      .then(({ data }) => { if (data) setDoctors(data); });
  }, []);

  // Subscribe to prescription updates
  useEffect(() => {
    if (!prescriptionId) return;
    const channel = supabase
      .channel(`prescription-${prescriptionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'prescriptions',
        filter: `id=eq.${prescriptionId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setPrescription(updated);
        if (updated.status === 'signed') {
          setStatus('signed');
          toast({
            title: lang === 'bn' ? '✅ প্রেসক্রিপশন স্বাক্ষরিত!' : '✅ Prescription Signed!',
            description: lang === 'bn' ? 'আপনার ডাক্তার প্রেসক্রিপশন অনুমোদন করেছেন।' : 'Your doctor has approved the prescription.',
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [prescriptionId]);

  const requestPrescription = async () => {
    setStatus('requesting');
    try {
      // Build AI-generated prescription from triage result
      const aiPrescription = {
        patient: patientInfo || {},
        diseases: triageResult.diseases,
        urgency: triageResult.urgency_level,
        medicines: triageResult.medicines || [],
        specialist: triageResult.specialist,
        explanation: triageResult.explanation,
        generated_at: new Date().toISOString(),
      };

      const insertData: any = {
        triage_session_id: sessionId,
        ai_generated_prescription: aiPrescription,
        urgency_level: triageResult.urgency_level,
        diseases: triageResult.diseases,
        medicines: triageResult.medicines || [],
        patient_symptoms: triageResult.explanation,
        triage_summary: triageResult,
        status: 'pending_review',
      };

      if (selectedDoctor !== 'any') {
        insertData.preferred_doctor_id = selectedDoctor;
      } else if (doctors.length > 0) {
        const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
        insertData.preferred_doctor_id = randomDoctor.id;
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;
      setPrescriptionId(data.id);
      setStatus('pending');
      toast({
        title: lang === 'bn' ? 'প্রেসক্রিপশন অনুরোধ পাঠানো হয়েছে' : 'Prescription request sent',
        description: lang === 'bn' ? 'একজন ডাক্তার শীঘ্রই পর্যালোচনা করবেন।' : 'A doctor will review it shortly.',
      });
    } catch (err: any) {
      setStatus('error');
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (status === 'idle') {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-3 space-y-3">
          <p className="font-bangla text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {lang === 'bn' ? 'প্রেসক্রিপশন চান?' : 'Want a prescription?'}
          </p>
          <p className="text-xs text-muted-foreground font-bangla">
            {lang === 'bn'
              ? 'একজন নিবন্ধিত ডাক্তার আপনার ট্রায়াজ পর্যালোচনা করে প্রেসক্রিপশন দেবেন।'
              : 'A registered doctor will review your triage and provide a signed prescription.'}
          </p>
          {doctors.length > 0 && (
            <div>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="font-bangla text-xs h-8">
                  <SelectValue placeholder={lang === 'bn' ? 'ডাক্তার নির্বাচন' : 'Select Doctor'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{lang === 'bn' ? 'যেকোনো উপলব্ধ ডাক্তার' : 'Any available doctor'}</SelectItem>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.full_name} ({d.specialization || 'General'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={requestPrescription} size="sm" className="w-full font-bangla gap-1">
            <FileText className="h-4 w-4" />
            {lang === 'bn' ? 'প্রেসক্রিপশন অনুরোধ করুন' : 'Request Prescription'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'requesting') {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-bangla text-sm">{lang === 'bn' ? 'অনুরোধ পাঠানো হচ্ছে...' : 'Sending request...'}</span>
        </CardContent>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="font-bangla text-sm font-medium">
              {lang === 'bn' ? 'ডাক্তারের পর্যালোচনার অপেক্ষায়...' : 'Waiting for doctor review...'}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">{lang === 'bn' ? 'রিয়েল-টাইম আপডেট সক্রিয়' : 'Real-time updates active'}</Badge>
        </CardContent>
      </Card>
    );
  }

  if (status === 'signed' && prescription) {
    const finalRx = prescription.final_prescription || prescription.doctor_revised_prescription || prescription.ai_generated_prescription;
    return (
      <Card className="bg-green-500/5 border-green-500/20">
        <CardContent className="pt-4 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-bangla text-sm font-medium text-green-700">
              {lang === 'bn' ? 'প্রেসক্রিপশন অনুমোদিত ✅' : 'Prescription Approved ✅'}
            </span>
          </div>
          {prescription.doctor_notes && (
            <p className="text-xs font-bangla bg-muted p-2 rounded">
              <UserCheck className="h-3 w-3 inline mr-1" />
              {lang === 'bn' ? 'ডাক্তারের মন্তব্য: ' : "Doctor's note: "}
              {prescription.doctor_notes}
            </p>
          )}
          {finalRx?.medicines && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {lang === 'bn' ? 'নির্ধারিত ওষুধ' : 'Prescribed Medicines'}
              </p>
              {(finalRx.medicines as any[]).map((m: any, i: number) => (
                <div key={i} className="text-xs bg-muted rounded p-2">
                  <span className="font-semibold">{m.name || m.generic}</span>
                  {m.dosage && <span className="ml-2 text-muted-foreground">— {m.dosage}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
