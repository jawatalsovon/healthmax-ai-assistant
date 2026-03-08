import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface UrgencyBadgeProps {
  level: string;
  className?: string;
}

export function UrgencyBadge({ level, className }: UrgencyBadgeProps) {
  const { t } = useLanguage();

  const config: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    emergency: { label: t('emergency'), bg: 'bg-emergency/15', text: 'text-emergency', icon: '🔴' },
    urgent: { label: t('urgent'), bg: 'bg-urgent/15', text: 'text-urgent', icon: '🟡' },
    moderate: { label: t('moderate'), bg: 'bg-primary/15', text: 'text-primary', icon: '🟠' },
    self_care: { label: t('selfCare'), bg: 'bg-safe/15', text: 'text-safe', icon: '🟢' },
  };

  const c = config[level] || config.moderate;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold font-bangla', c.bg, c.text, className)}>
      {c.icon} {c.label}
    </span>
  );
}
