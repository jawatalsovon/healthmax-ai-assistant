import { UrgencyBadge } from '@/components/UrgencyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import { TriageResult } from '@/types/triage';
import { DoctorRecommendations } from '@/components/DoctorRecommendations';

interface Props {
  result: TriageResult;
  lang: 'bn' | 'en';
  t: (key: string) => string;
}

export function TriageResultCard({ result, lang, t }: Props) {
  return (
    <div className="space-y-3">
      {result.assessment_round && result.assessment_total_rounds && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {lang === 'bn' ? 'Assessment Progress' : 'Assessment Progress'}
          </p>
          <p className="text-sm font-bangla">
            {lang === 'bn'
              ? `রাউন্ড ${result.assessment_round} / ${result.assessment_total_rounds}`
              : `Round ${result.assessment_round} / ${result.assessment_total_rounds}`}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <UrgencyBadge level={result.urgency_level} />
        {result.ml_classifier_used && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Brain className="h-3 w-3" />
            {result.ai_fallback ? 'ML Only' : 'ML + AI'}
          </Badge>
        )}
        {result.is_final_assessment && (
          <Badge variant="default" className="text-xs">
            {lang === 'bn' ? 'Final Diagnosis' : 'Final Diagnosis'}
          </Badge>
        )}
      </div>

      {result.diseases && result.diseases.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{t('topDiseases')}</p>
          {result.diseases.map((d, j) => (
            <ConfidenceBar
              key={j}
              label={lang === 'bn' ? d.name_bn || d.name : d.name}
              value={d.confidence}
            />
          ))}
        </div>
      )}

      {result.specialist && (
        <div className="text-sm">
          <span className="font-semibold font-bangla">{t('specialist')}: </span>
          <span className="font-bangla">{result.specialist}</span>
        </div>
      )}

      {result.recommended_facility && (
        <div className="text-sm">
          <span className="font-semibold font-bangla">{t('recommendedFacility')}: </span>
          <span className="font-bangla">{lang === 'bn' ? result.recommended_facility_bn || result.recommended_facility : result.recommended_facility}</span>
        </div>
      )}

      {result.medicines && result.medicines.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{t('suggestedMedicines')}</p>
          {result.medicines.map((m, j) => (
            <div key={j} className="text-xs bg-muted rounded-lg p-2.5 space-y-1">
              <div>
                <span className="font-semibold">{m.name}</span>
                <span className="text-muted-foreground"> ({m.generic})</span>
              </div>
              <div className="text-primary font-medium">{m.price}</div>
              {m.alternatives && m.alternatives.length > 0 && (
                <div className="border-t pt-1 mt-1">
                  <span className="text-muted-foreground">{lang === 'bn' ? 'বিকল্প:' : 'Alternatives:'}</span>
                  {m.alternatives.map((alt, k) => (
                    <span key={k} className="ml-1">{alt.brand} ({alt.price})</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {result.partner_doctors && result.partner_doctors.length > 0 && (
        <DoctorRecommendations doctors={result.partner_doctors} lang={lang} />
      )}
    </div>
  );
}
