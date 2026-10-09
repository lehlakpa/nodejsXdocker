import { formatMoney as money } from "../../../utils/products.js";
export default function ProductCard({ product, onEdit, onDelete }) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-stone-200 p-5">
      <span
        aria-hidden="true"
        className="mb-4 grid size-10 place-items-center rounded-lg bg-[#eef1e5] text-[#708560]"
      >
        {product.title[0]?.toUpperCase()}
      </span>
      <h3 className="mb-2 break-words text-sm font-semibold">
        {product.title}
      </h3>
      <p className="mb-4 whitespace-pre-wrap break-words text-xs leading-6 text-stone-500">
        {product.description || "No description added yet."}
      </p>
      <strong className="mt-auto text-lg font-semibold">
        {money(product.price)}
      </strong>
      <div className="mt-4 flex justify-between border-t border-stone-100 pt-3">
        <button
          onClick={() => onEdit(product)}
          className="rounded bg-[#f5f7f0] px-3 py-2 text-[10px]"
        >
          Edit product
        </button>
        <button
          aria-label={`Delete ${product.title}`}
          onClick={() => onDelete(product)}
          className="rounded bg-red-50 px-3 py-2 text-[10px] text-red-700"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
