import { useState } from "react";
import { optimizedImage } from "../utils/images.js";

export default function ProductGallery({ product }) {
  const [selected, setSelected] = useState(0);
  const images = product.images || [];
  const active = Math.min(selected, Math.max(images.length - 1, 0));
  if (!images.length) return <div aria-hidden="true" className="grid h-52 place-items-center rounded-xl bg-[#e8eee2] text-6xl font-light text-[#72876a]">{product.title[0]?.toUpperCase()}</div>;
  return <div className="space-y-2">
    <a href={images[active].url} target="_blank" rel="noreferrer" aria-label={`View full-size image ${active + 1} of ${product.title}`} className="block rounded-xl bg-stone-50">
      <img src={optimizedImage(images[active].url)} alt={`${product.title} — view ${active + 1}`} loading="lazy" decoding="async" width="640" height="416" className="h-52 w-full rounded-xl object-contain" />
    </a>
    {images.length > 1 && <div className="flex gap-2 px-2 pb-2" aria-label={`${product.title} images`}>
      {images.map((image, index) => <button type="button" key={image.url} aria-label={`Show image ${index + 1} of ${product.title}`} aria-pressed={active === index} onClick={() => setSelected(index)} className={`overflow-hidden rounded-lg border-2 ${active === index ? "border-green-800" : "border-transparent"}`}><img src={optimizedImage(image.url, 112)} alt="" loading="lazy" className="h-14 w-14 bg-stone-50 object-contain" /></button>)}
    </div>}
  </div>;
}
