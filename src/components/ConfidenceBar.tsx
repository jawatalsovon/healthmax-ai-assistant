import { cn } from '@/lib/utils';

interface ConfidenceBarProps {
  label: string;
  value: number;
  className?: string;
}

export function ConfidenceBar({ label, value, className }: ConfidenceBarProps) {
  const color = value > 70 ? 'bg-emergency' : value > 40 ? 'bg-urgent' : 'bg-safe';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span className="font-bangla font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
