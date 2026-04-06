import { Button } from '@shared/ui/Button';

type PaginationControlsProps = {
  itemCount: number;
  hasPrevious: boolean;
  hasMore: boolean;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationControls({ itemCount, hasPrevious, hasMore, loading = false, onPrevious, onNext }: PaginationControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
      <div>
        <span className="font-medium text-white">{itemCount}</span> item{itemCount === 1 ? '' : 's'} on this cursor page
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={!hasPrevious || loading} onClick={onPrevious}>
          Previous
        </Button>
        <Button type="button" variant="secondary" disabled={!hasMore || loading} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
