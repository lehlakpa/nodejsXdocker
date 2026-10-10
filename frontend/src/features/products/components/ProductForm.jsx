import Button from "../../../components/ui/Button.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import { LIMITS } from "../../../constants/app.js";
import { useEffect, useRef, useState } from "react";

function ImagePreview({ file }) {
  const imageRef = useRef(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    imageRef.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <img ref={imageRef} alt={file.name} className="h-24 w-24 rounded-lg border border-stone-200 object-contain" />;
}

export default function ProductForm({ product, busy, onSubmit, onCancel }) {
  const [existing, setExisting] = useState(product?.images || []);
  const [files, setFiles] = useState([]);
  const [imageError, setImageError] = useState("");
  function chooseImages(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (existing.length + files.length + selected.length > 3) return setImageError("Choose at most 3 images in total. Remove an image to add another.");
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) return setImageError("Use JPG, PNG or WebP images, each 5 MB or smaller.");
    setImageError("");
    setFiles(current => [...current, ...selected]);
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...Object.fromEntries(new FormData(event.currentTarget)), images: files, retainedImages: existing.map(image => image.publicId) });
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
        <div className="space-y-3">
          <label className="block text-sm font-medium">Product images
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} className="mt-2 block w-full rounded-lg border border-stone-200 p-3 text-xs" />
          </label>
          <p className="text-xs text-stone-500">Add 2–3 views to help customers choose. Maximum 3 images, 5 MB each. The first image is the cover.</p>
          <div className="flex flex-wrap gap-3">
            {existing.map((image, index) => <div key={image.publicId} className="w-24"><img src={image.url} alt={`Product image ${index + 1}`} className="h-24 w-24 rounded-lg border border-stone-200 object-contain" /><button type="button" onClick={() => { setExisting(current => current.filter(item => item.publicId !== image.publicId)); setImageError(""); }} className="mt-1 text-xs text-red-700">Remove image {index + 1}</button></div>)}
            {files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="w-24"><ImagePreview file={file} /><button type="button" onClick={() => { setFiles(current => current.filter((_, position) => position !== index)); setImageError(""); }} className="mt-1 text-xs text-red-700">Remove new {index + 1}</button></div>)}
          </div>
          {imageError && <p role="alert" className="text-xs text-red-700">{imageError}</p>}
        </div>
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
