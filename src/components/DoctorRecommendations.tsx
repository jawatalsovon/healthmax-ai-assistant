import { useMemo, useState } from 'react';
import { DoctorRecommendation } from '@/types/triage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Stethoscope } from 'lucide-react';

interface Props {
  doctors: DoctorRecommendation[];
  lang: 'bn' | 'en';
}

export function DoctorRecommendations({ doctors, lang }: Props) {
  const [selectedArea, setSelectedArea] = useState<string>('all');

  const areas = useMemo(() => {
    return ['all', ...Array.from(new Set(doctors.map((doctor) => doctor.area))).sort()];
  }, [doctors]);

  const visibleDoctors = useMemo(() => {
    if (selectedArea === 'all') {
      return doctors;
    }
    return doctors.filter((doctor) => doctor.area === selectedArea);
  }, [doctors, selectedArea]);

  if (!doctors.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {lang === 'bn' ? 'Recommended Doctors Near You' : 'Recommended Doctors Near You'}
          </p>
          <Badge variant="outline" className="font-bangla text-[10px]">
            {lang === 'bn' ? 'Sponsored / Partner Doctors' : 'Sponsored / Partner Doctors'}
          </Badge>
        </div>

        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-[180px] h-8 text-xs font-bangla">
            <SelectValue placeholder={lang === 'bn' ? 'এলাকা বাছাই করুন' : 'Select area'} />
          </SelectTrigger>
          <SelectContent>
            {areas.map((area) => (
              <SelectItem key={area} value={area} className="font-bangla text-xs">
                {area === 'all' ? (lang === 'bn' ? 'সব এলাকা' : 'All areas') : area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {visibleDoctors.map((doctor, index) => (
          <Card key={`${doctor.name}-${doctor.area}-${index}`} className="border-primary/15 bg-primary/5">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold font-bangla">{doctor.name}</p>
                    {doctor.sponsored && (
                      <Badge variant="secondary" className="text-[10px]">Partner</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-bangla">{doctor.specialization}</p>
                  <p className="text-xs text-primary font-medium font-bangla">{doctor.tagline}</p>
                </div>
              </div>

              <div className="grid gap-2 text-xs font-bangla">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{doctor.hospital}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{doctor.area}</span>
                </div>
              </div>

              <Button asChild size="sm" className="w-full font-bangla">
                <a href={doctor.contact} target="_blank" rel="noreferrer">
                  {lang === 'bn' ? 'যোগাযোগ / অ্যাপয়েন্টমেন্ট' : 'Contact / Appointment'}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
