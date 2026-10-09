import Button from "../../../components/ui/Button.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import { LIMITS } from "../../../constants/app.js";

export default function ProductForm({ product, busy, onSubmit, onCancel }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      }}
    >
      <p className="mb-5 text-xs leading-6 text-stone-500">
        Give your next great thing a place to live.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <FormField
          label="Product name"
          name="title"
          required
          maxLength={LIMITS.TITLE}
          defaultValue={product?.title || ""}
          placeholder="e.g. Everyday notebook"
        />
        <FormField
          label="Price (NPR)"
          name="price"
          type="number"
          required
          min="0"
          step="0.01"
          defaultValue={product?.price ?? ""}
          placeholder="0.00"
        />
        <FormField
          label="Description"
          name="description"
          optional
          multiline
          maxLength={LIMITS.DESCRIPTION}
          rows={4}
          defaultValue={product?.description || ""}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save product"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
