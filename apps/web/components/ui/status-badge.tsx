import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type ErcStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISIT';

const STATUS_STYLE: Record<ErcStatus, string> = {
  NOT_STARTED: 'bg-muted/15 text-muted',
  IN_PROGRESS: 'bg-accent-2/15 text-accent-2',
  SUBMITTED: 'bg-warning/20 text-warning',
  APPROVED: 'bg-success/15 text-success',
  REVISIT: 'bg-accent/12 text-accent',
};

const STATUS_KEY: Record<ErcStatus, string> = {
  NOT_STARTED: 'statusNotStarted',
  IN_PROGRESS: 'statusInProgress',
  SUBMITTED: 'statusSubmitted',
  APPROVED: 'statusApproved',
  REVISIT: 'statusRevisit',
};

export function StatusBadge({ status, className }: { status: ErcStatus | string; className?: string }) {
  const t = useTranslations('journey.erc');
  const key = (status in STATUS_STYLE ? status : 'NOT_STARTED') as ErcStatus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
        STATUS_STYLE[key],
        className,
      )}
    >
      {t(STATUS_KEY[key])}
    </span>
  );
}
