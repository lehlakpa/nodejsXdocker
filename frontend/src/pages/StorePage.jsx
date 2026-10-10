import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import Checkout from "../components/Checkout.jsx";
import PaymentResult from "../components/PaymentResult.jsx";
import { formatMoney } from "../utils/products.js";
import ProductGallery from "../components/ProductGallery.jsx";

export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiClient.request("/store/products", { signal: controller.signal, refresh: false })
      .then(data => setProducts(data.products))
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const filtered = products.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-screen bg-[#f8f9f6] text-[#293d34] antialiased">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <a href="/" className="text-2xl font-bold tracking-tight">stockroom<span className="text-green-700">.</span></a>
      <a href="#products" className="text-sm font-medium">Shop products ↗</a>
    </div></header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <PaymentResult guest />
      <section className="mb-10 rounded-3xl bg-[#214d3c] px-7 py-12 text-white sm:p-14">
        <p className="text-xs tracking-[.2em] text-green-200">SIMPLE SHOPPING, EVERY DAY</p>
        <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Find it. Love it.<br />Make it yours.</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-green-100">Pick your product, fill in your details, and place your order. Pay with cash on delivery or eSewa.</p>
        <a href="#products" className="mt-7 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#214d3c]">Explore products ↓</a>
      </section>
      <section id="products">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-stone-500">The collection</p><h2 className="mt-2 text-3xl font-semibold">Shop products</h2></div>
          <input type="search" aria-label="Search products" placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 sm:w-72" /></div>
        {error ? <div role="alert" className="rounded-xl bg-white p-8"><p>{error}</p><button className="mt-4 underline" onClick={() => { setError(""); setLoading(true); setRevision(v => v + 1); }}>Try again</button></div>
          : loading ? <p role="status" className="py-12 text-center">Loading products…</p>
          : filtered.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(product => <article key={product._id} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <ProductGallery product={product} />
            <div className="flex flex-1 flex-col p-6"><h3 className="break-words text-xl font-semibold">{product.title}</h3><p className="mb-6 mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-500">{product.description || "Ready to order, delivered to you."}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3"><strong className="text-xl">{formatMoney(product.price)}</strong><button onClick={() => setPurchase(product)} className="rounded-xl bg-[#214d3c] px-5 py-3 text-sm font-semibold text-white">Order now ↗</button></div>
            </div></article>)}</div> : <p className="rounded-2xl border border-stone-200 bg-white p-12 text-center">{query ? "No products match your search." : "New products are on their way. Please check back soon."}</p>}
      </section>
      <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-stone-200 py-6 text-xs text-stone-500"><span>stockroom · Everyday essentials.</span><span>Cash on delivery / eSewa</span></footer>
    </main>
    {purchase && <Checkout guest product={purchase} close={() => setPurchase(null)} />}
  </div>;
}
