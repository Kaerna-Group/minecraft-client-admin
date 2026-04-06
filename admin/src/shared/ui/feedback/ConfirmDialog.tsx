import { Button } from '@shared/ui/Button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#09101d]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-rose-300/80">Confirmation required</p>
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          <p className="text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
