import { useEffect, useId, useRef, type ReactNode } from 'react';

export function AnalysisDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const heading = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    close.current?.focus();
    return () => {
      element.close();
      if (opener.current?.isConnected) opener.current.focus();
    };
  }, [open]);
  return <dialog ref={dialog} className="analysis-drawer" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onCloseRef.current(); }} onClick={event => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCloseRef.current(); }}>
    <header className="analysis-drawer-header"><h2 id={heading}>{title}</h2><button ref={close} className="button" type="button" onClick={onClose}>Close</button></header>
    <div className="analysis-drawer-content">{open && children}</div>
  </dialog>;
}
