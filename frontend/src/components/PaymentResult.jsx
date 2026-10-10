import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import Button from "./ui/Button.jsx";
import { formatMoney } from "../utils/products.js";

export default function PaymentResult({ user, guest = false }) {
  const [orderId, setOrderId] = useState(() => new URLSearchParams(window.location.search).get("order") || sessionStorage.getItem("pendingOrder"));
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!orderId) return;
    sessionStorage.setItem("pendingOrder", orderId);
    const url = new URL(window.location.href);
    for (const key of ["order", "payment", "data"]) url.searchParams.delete(key);
    window.history.replaceState({}, "", url);
  }, [orderId]);
  useEffect(() => {
    if ((!user && !guest) || !orderId) return;
    let active = true;
    apiClient.request(`${guest ? "/store" : ""}/orders/${encodeURIComponent(orderId)}/verify`, { method: "POST", refresh: !guest, ...(guest ? { body: { token: sessionStorage.getItem(`guestOrder:${orderId}`) } } : {}) })
      .then(result => { if (active) setOrder(result.order); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [user, orderId, guest]);
  if (!orderId) return null;
  async function check() {
    setBusy(true); setError("");
    try {
      const result = await apiClient.request(`${guest ? "/store" : ""}/orders/${encodeURIComponent(orderId)}/verify`, { method: "POST", refresh: !guest, ...(guest ? { body: { token: sessionStorage.getItem(`guestOrder:${orderId}`) } } : {}) });
      setOrder(result.order);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="mb-5 space-y-3 rounded-xl border border-green-200 bg-green-50 p-5" aria-live="polite">
    <h2 className="font-semibold">{order?.paymentStatus === "paid" ? "Payment successful" : "Check your payment"}</h2>
    <p className="text-sm">{!user && !guest ? "Sign in to verify your order." : order?.paymentStatus === "paid" ? `${order.title} · ${formatMoney(order.amount)} paid with eSewa.` : "Your payment is not confirmed yet. If you cancelled, it remains unpaid. If money was deducted, check again before paying again."}</p>
    <p className="break-all text-xs text-stone-500">Order: {orderId}</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex gap-3">
      {(user || guest) && order?.paymentStatus !== "paid" && <Button disabled={busy} onClick={check}>{busy ? "Checking…" : "Check payment"}</Button>}
      <Button variant="secondary" onClick={() => { sessionStorage.removeItem("pendingOrder"); setOrderId(null); }}>Dismiss</Button>
    </div>
  </section>;
}
