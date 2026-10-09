import Button from "../../../components/ui/Button.jsx";
import { SORT_OPTIONS } from "../../../constants/app.js";
import ProductCard from "./ProductCard.jsx";
export default function ProductCollection({
  products,
  filtered,
  user,
  query,
  setQuery,
  sort,
  setSort,
  refresh,
  loading,
  status,
  loaded,
  add,
  onSignIn,
  onEdit,
  onDelete,
  onBuy,
}) {
  return (
    <section
      id="products"
      className="overflow-hidden rounded-xl border border-stone-200 bg-white"
    >
      <div className="flex items-center justify-between p-5">
        <h2 className="text-sm font-semibold">
          Your collection{" "}
          <span className="ml-2 rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
            {products.length}
          </span>
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-[#5d7552] disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 pb-5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search products"
          placeholder="Search your products…"
          className="w-full rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2.5 text-xs outline-green-700 sm:w-72"
        />
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="rounded-lg border border-stone-200 p-2.5 text-xs"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {status && (
        <p role="alert" className="px-5 pt-5 text-center text-xs text-red-700">
          {status}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-12 text-center text-sm text-stone-500">
          Loading your workspace…
        </p>
      ) : filtered.length ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
              onBuy={onBuy}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-9 text-center">
          <span
            aria-hidden="true"
            className="inline-grid size-12 -rotate-6 place-items-center rounded-xl bg-[#f0f4e9] text-3xl text-[#8c9f77]"
          >
            ▧
          </span>
          <h3 className="mb-2 mt-4 text-sm font-semibold">
            {!user
              ? "A fresh start for your collection"
              : query
                ? "No matching products"
                : loaded
                  ? "Your next great thing starts here"
                  : "Your collection is waiting"}
          </h3>
          <p className="mb-4 text-xs leading-6 text-stone-500">
            {!user
              ? "Sign in to bring all your products together."
              : query
                ? "Try a different name or description."
                : loaded
                  ? "Add your first product and make this space your own."
                  : "Refresh to load your products."}
          </p>
          <Button
            onClick={() =>
              !user
                ? onSignIn()
                : query
                  ? setQuery("")
                  : loaded
                    ? add()
                    : refresh()
            }
          >
            {!user
              ? "Get started ↗"
              : query
                ? "Clear search"
                : loaded
                  ? "＋ Add your first product"
                  : "↻ Try again"}
          </Button>
        </div>
      )}
      <div className="flex justify-between border-t border-stone-200 px-5 py-3 text-[9px] text-stone-400">
        <span>
          {filtered.length} of {products.length} products
        </span>
        <span className="hidden sm:block">
          A little order. A lot of possibility.
        </span>
      </div>
    </section>
  );
}
