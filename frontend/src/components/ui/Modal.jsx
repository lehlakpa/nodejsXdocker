import { useEffect, useId, useRef } from "react";

export default function Modal({ title, close, busy, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby={titleId}
      className="fixed inset-0 m-auto max-h-[90dvh] max-w-[calc(100%-32px)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-7 text-[#293d34] shadow-2xl backdrop:bg-[#182b2466] backdrop:backdrop-blur-sm"
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[9px] font-semibold tracking-[.2em] text-stone-500">
          YOUR STOCKROOM
        </span>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close dialog"
          className="size-8 rounded-full bg-stone-100 text-xl disabled:opacity-40"
        >
          ×
        </button>
      </div>
      <h2 id={titleId} className="mb-3 text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
