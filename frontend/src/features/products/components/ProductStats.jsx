import { formatMoney as money } from "../../../utils/products.js";
export default function ProductStats({ products }) {
  const total = products.reduce((sum, p) => sum + p.price, 0);
  return (
    <section
      aria-label="Collection summary"
      className="my-6 grid grid-cols-1 gap-3 min-[460px]:grid-cols-3 sm:gap-4"
    >
      {[
        ["Total products", products.length, "Items in your collection"],
        ["Collection value", money(total), "Sum of listed product prices"],
        [
          "Average price",
          money(products.length ? total / products.length : 0),
          "Across your entire collection",
        ],
      ].map(([label, value, description]) => (
        <article
          key={label}
          className="min-w-0 rounded-xl border border-stone-200 bg-white p-5"
        >
          <p className="text-[11px] text-stone-500">{label}</p>
          <strong className="mt-3 block break-words text-xl font-semibold tracking-tight lg:text-2xl">
            {value}
          </strong>
          <p className="mt-2 text-[10px] text-stone-400">{description}</p>
        </article>
      ))}
    </section>
  );
}
