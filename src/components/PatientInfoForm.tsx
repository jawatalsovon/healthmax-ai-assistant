import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, ChevronRight, SkipForward } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PatientInfo } from '@/types/triage';

interface Props {
  onSubmit: (info: PatientInfo) => void;
  onSkip: () => void;
}

export function PatientInfoForm({ onSubmit, onSkip }: Props) {
  const { lang } = useLanguage();
  const [info, setInfo] = useState<PatientInfo>({});
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('registered_doctors')
      .select('id, full_name, specialization, hospital_affiliation')
      .eq('is_verified', true)
      .eq('is_available', true)
      .then(({ data }) => { if (data) setDoctors(data); });
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <CardTitle className="font-bangla">
            {lang === 'bn' ? 'রোগীর তথ্য (ঐচ্ছিক)' : 'Patient Information (Optional)'}
          </CardTitle>
          <p className="text-sm text-muted-foreground font-bangla">
            {lang === 'bn' ? 'আরও সঠিক নির্ণয়ের জন্য আপনার তথ্য দিন' : 'Provide your info for more accurate diagnosis'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-bangla text-xs">{lang === 'bn' ? 'নাম' : 'Name'}</Label>
              <Input
                value={info.full_name || ''}
                onChange={e => setInfo(p => ({ ...p, full_name: e.target.value }))}
                placeholder={lang === 'bn' ? 'আপনার নাম' : 'Your name'}
                className="font-bangla"
              />
            </div>
            <div>
              <Label className="font-bangla text-xs">{lang === 'bn' ? 'বয়স' : 'Age'}</Label>
              <Input
                type="number"
                value={info.age || ''}
                onChange={e => setInfo(p => ({ ...p, age: parseInt(e.target.value) || undefined }))}
                placeholder="25"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-bangla text-xs">{lang === 'bn' ? 'লিঙ্গ' : 'Gender'}</Label>
              <Select onValueChange={v => setInfo(p => ({ ...p, gender: v }))}>
                <SelectTrigger className="font-bangla"><SelectValue placeholder={lang === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{lang === 'bn' ? 'পুরুষ' : 'Male'}</SelectItem>
                  <SelectItem value="female">{lang === 'bn' ? 'মহিলা' : 'Female'}</SelectItem>
                  <SelectItem value="other">{lang === 'bn' ? 'অন্যান্য' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bangla text-xs">{lang === 'bn' ? 'ফোন' : 'Phone'}</Label>
              <Input
                value={info.phone || ''}
                onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
          <div>
            <Label className="font-bangla text-xs">{lang === 'bn' ? 'এলার্জি' : 'Known Allergies'}</Label>
            <Input
              value={(info.allergies || []).join(', ')}
              onChange={e => setInfo(p => ({ ...p, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              placeholder={lang === 'bn' ? 'কমা দিয়ে আলাদা করুন' : 'Separate with commas'}
              className="font-bangla"
            />
          </div>
          <div>
            <Label className="font-bangla text-xs">{lang === 'bn' ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</Label>
            <Input
              value={(info.chronic_conditions || []).join(', ')}
              onChange={e => setInfo(p => ({ ...p, chronic_conditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              placeholder={lang === 'bn' ? 'যেমন: ডায়াবেটিস, উচ্চ রক্তচাপ' : 'e.g. Diabetes, Hypertension'}
              className="font-bangla"
            />
          </div>

          {doctors.length > 0 && (
            <div>
              <Label className="font-bangla text-xs">{lang === 'bn' ? 'পছন্দের ডাক্তার (ঐচ্ছিক)' : 'Preferred Doctor (Optional)'}</Label>
              <Select onValueChange={v => setInfo(p => ({ ...p, preferred_doctor_id: v === 'any' ? undefined : v }))}>
                <SelectTrigger className="font-bangla"><SelectValue placeholder={lang === 'bn' ? 'যেকোনো উপলব্ধ ডাক্তার' : 'Any available doctor'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{lang === 'bn' ? 'যেকোনো উপলব্ধ ডাক্তার' : 'Any available doctor'}</SelectItem>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name} — {d.specialization || 'General'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSubmit(info)} className="flex-1 font-bangla gap-1">
              {lang === 'bn' ? 'শুরু করুন' : 'Start Triage'} <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onSkip} className="font-bangla gap-1">
              <SkipForward className="h-4 w-4" /> {lang === 'bn' ? 'এড়িয়ে যান' : 'Skip'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
