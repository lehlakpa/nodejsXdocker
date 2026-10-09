import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import { formatMoney } from "../utils/products.js";

export default function OrdersPage({ user, onSignIn }) {
  const [orders, setOrders] = useState([]);
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    const controller = new AbortController();
    const query = new URLSearchParams({ page, ...(method ? { method } : {}), ...(status ? { status } : {}) });
    async function load() {
      try {
        const sync = await apiClient.request("/orders/sync", { method: "POST", signal: controller.signal });
        if (active && sync.unavailable) setNotice("Some eSewa payments could not be checked. Refresh to retry; your orders are shown below.");
      } catch {
        if (active) setNotice("Payment verification is temporarily unavailable. Your saved orders are shown below.");
      }
      controller.signal.throwIfAborted();
      return apiClient.request(`/orders?${query}`, { signal: controller.signal });
    }
    load()
      .then(data => { if (active) { setOrders(data.orders); setHasMore(data.hasMore); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [user, method, status, page, revision]);
  function refresh() { setLoading(true); setError(""); setRevision(value => value + 1); }
  function filter(setter, value) { setLoading(true); setError(""); setPage(1); setter(value); }
  async function update(order, action) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await apiClient.request(`/orders/${order._id}/${action}`, { method: "POST" });
      setConfirm(null);
      setNotice(data.order.paymentStatus === "paid"
        ? `${data.order.paymentMethod === "cash" ? "Cash receipt recorded" : "eSewa payment verified"}.`
        : "eSewa payment is still unconfirmed. Check again later before paying again.");
      refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section id="orders">
    <div className="mb-7 flex items-center justify-between gap-3">
      <div><p className="mb-2 text-[9px] tracking-[.18em] text-stone-500">YOUR PURCHASES, IN ONE PLACE</p>
        <h1 className="text-4xl font-semibold tracking-tighter">Orders<span className="text-[#7b9361]">.</span></h1>
        <p className="mt-2 text-xs text-stone-500">Track Cash and eSewa payments separately.</p></div>
      {user && <Button disabled={loading || busy} onClick={refresh}>Refresh</Button>}
    </div>
    {!user ? <div className="rounded-xl border border-stone-200 bg-white p-10 text-center"><p className="mb-4 text-sm">Sign in to view your orders.</p><Button onClick={onSignIn}>Sign in</Button></div> : <>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-xs">Payment method<select disabled={busy} value={method} onChange={e => filter(setMethod, e.target.value)} className="ml-2 rounded-lg border border-stone-200 bg-white p-3"><option value="">All methods</option><option value="cash">Cash</option><option value="esewa">eSewa</option></select></label>
        <label className="text-xs">Payment status<select disabled={busy} value={status} onChange={e => filter(setStatus, e.target.value)} className="ml-2 rounded-lg border border-stone-200 bg-white p-3"><option value="">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select></label>
      </div>
      {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      <div className="rounded-xl border border-stone-200 bg-white">
        {loading ? <p role="status" className="p-10 text-center text-sm">Loading orders…</p> : orders.length ? <div className="divide-y divide-stone-100">
          {orders.map(order => <article key={order._id} className="flex flex-wrap items-center justify-between gap-5 p-5">
            <div className="min-w-0 flex-1 basis-48"><h2 className="break-words text-sm font-semibold">{order.title}</h2>
              <p className="mt-2 break-all text-[10px] text-stone-500">Order #{order._id}</p>
              <p className="mt-1 text-xs text-stone-500">{new Date(order.createdAt).toLocaleString()}</p>
              {order.reference && <p className="mt-1 break-all text-xs text-stone-500">eSewa reference: {order.reference}</p>}
              {order.paidAt && <p className="mt-1 text-xs text-stone-500">Paid: {new Date(order.paidAt).toLocaleString()}</p>}
            </div>
            <div className="space-y-2"><strong className="block text-lg">{formatMoney(order.amount)}</strong>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-stone-100 px-3 py-1 text-xs">{order.paymentMethod === "cash" ? "Cash" : "eSewa"}</span>
                <span className={`rounded-full px-3 py-1 text-xs ${order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{order.paymentStatus === "paid" ? "Paid" : "Pending"}</span></div>
              {order.paymentStatus === "pending" && <p className="text-xs text-stone-500">{order.paymentMethod === "cash" ? "Cash not yet recorded" : "Awaiting eSewa confirmation"}</p>}
            </div>
            {order.paymentStatus === "pending" && <Button variant="secondary" disabled={busy} onClick={() => order.paymentMethod === "cash" ? setConfirm(order) : update(order, "verify")}>{order.paymentMethod === "cash" ? "Record cash payment" : "Check eSewa payment"}</Button>}
          </article>)}
        </div> : <div className="p-12 text-center"><h2 className="text-sm font-semibold">No orders found</h2><p className="mt-2 text-xs text-stone-500">Buy a product or change the payment filters.</p></div>}
      </div>
      <div className="mt-4 flex items-center justify-between"><Button variant="secondary" disabled={page === 1 || loading || busy} onClick={() => { setLoading(true); setPage(value => value - 1); }}>Previous</Button><span className="text-xs">Page {page}</span><Button variant="secondary" disabled={!hasMore || loading || busy} onClick={() => { setLoading(true); setPage(value => value + 1); }}>Next</Button></div>
    </>}
    {confirm && <Modal title="Record cash payment?" busy={busy} close={() => setConfirm(null)}>
      <p className="mb-5 text-sm leading-6">Confirm that {formatMoney(confirm.amount)} cash has been received for {confirm.title}. This will mark the order as paid.</p>
      <div className="flex gap-3"><Button disabled={busy} onClick={() => update(confirm, "cash-paid")}>{busy ? "Saving…" : "Confirm cash received"}</Button><Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button></div>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </Modal>}
  </section>;
}
