import { useRef, useState } from "react";
import { apiClient } from "../api/client.js";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import { formatMoney } from "../utils/products.js";
import ProductGallery from "./ProductGallery.jsx";

export default function Checkout({ product, close, guest = false }) {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const requestKey = useRef(crypto.randomUUID());
  const submitted = useRef(false);
  async function buy(event) {
    event.preventDefault();
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiClient.request(guest ? "/store/orders" : "/orders", { method: "POST", refresh: !guest,
        body: { productId: product._id, paymentMethod: method, requestKey: requestKey.current,
          ...(guest ? { customer, quantity } : {}) } });
      if (guest) sessionStorage.setItem(`guestOrder:${result.order._id}`, requestKey.current);
      setOrder(result.order);
      if (result.payment) {
        sessionStorage.setItem("pendingOrder", result.order._id);
        const form = document.createElement("form");
        form.method = "POST";
        form.action = result.payment.action;
        for (const [name, value] of Object.entries(result.payment.fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        form.remove();
      }
    } catch (err) { setError(err.message); }
    finally { submitted.current = false; setBusy(false); }
  }
  return (
    <Modal title={order ? "Your order" : "Buy product"} close={close} busy={busy}>
      {order ? <div className="space-y-4 text-sm">
        <p>{order.paymentMethod === "cash" ? "Order placed. Pay with cash when you receive your product." : "Opening eSewa to complete your payment. If it does not open, return to this page to check your payment."}</p>
        <p className="break-all text-xs text-stone-500">Order: {order._id}</p>
        <p>{order.title} · {formatMoney(order.amount)}</p>
        <Button onClick={close}>Done</Button>
        {!guest && <a href="#orders" onClick={close} className="ml-4 text-sm font-semibold underline">View orders</a>}
      </div> : <form onSubmit={buy} className="space-y-5">
        <div className="rounded-lg bg-stone-50 p-4">
          <ProductGallery product={product} />
          <p className="font-semibold break-words">{product.title}</p>
          <p className="mt-2 text-lg">{formatMoney(Math.round(product.price * 100) * quantity / 100)}</p>
          <p className="mt-1 text-xs text-stone-500">Quantity: {quantity} · No additional charges</p>
        </div>
        {guest && <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-3 text-sm font-semibold">Your delivery details</legend>
          {[["name", "Full name", "text", "name", 100], ["phone", "Phone number", "tel", "tel", 20], ["address", "Delivery address", "text", "street-address", 500]].map(([key, label, type, autoComplete, maxLength]) => <label key={key} className="block text-sm font-medium">{label} <span aria-hidden="true">*</span>
            <input required type={type} autoComplete={autoComplete} maxLength={maxLength} minLength={key === "address" ? 5 : key === "name" ? 2 : 7} pattern={key === "phone" ? "[+]?[0-9 ()\\-]{7,20}" : undefined} value={customer[key]} onChange={e => setCustomer(current => ({ ...current, [key]: e.target.value }))} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3" />
          </label>)}
          <label className="block text-sm font-medium">Quantity / Number of items *<input required type="number" min="1" max="100" step="1" value={quantity} onChange={e => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3" /></label>
        </fieldset>}
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">Payment method</legend>
          {[ ["cash", "Cash", "Pay when you receive the product"], ["esewa", "eSewa", "Pay securely with your eSewa wallet"] ].map(([value, label, hint]) => (
            <label key={value} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${method === value ? "border-green-700 bg-green-50" : "border-stone-200"}`}>
              <input type="radio" name="paymentMethod" value={value} checked={method === value}
                onChange={() => { setMethod(value); requestKey.current = crypto.randomUUID(); }} />
              <span><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-stone-500">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Placing order…" : method === "cash" ? "Place cash order" : "Continue to eSewa"}</Button>
      </form>}
      {error && <p role="alert" className="mt-4 text-xs text-red-700">{error}</p>}
    </Modal>
  );
}
