"use client";

export function Modal({ open, title, children, onClose, footer }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[min(92vw,680px)] penny-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1"><h2 className="text-xl font-extrabold">{title}</h2></div>
          <button className="penny-btn bg-white" onClick={onClose}>Close</button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
