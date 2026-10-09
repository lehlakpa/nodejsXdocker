import Button from "./Button.jsx";

export default function ConfirmAction({
  description,
  busy,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}) {
  return (
    <>
      <p className="mb-6 text-xs leading-6 text-stone-500">{description}</p>
      <div className="flex justify-end gap-2">
        <Button disabled={busy} variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button disabled={busy} variant="danger" onClick={onConfirm}>
          {busy ? "Please wait…" : confirmLabel}
        </Button>
      </div>
    </>
  );
}
