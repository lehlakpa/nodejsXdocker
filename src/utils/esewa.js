import { createHmac } from "node:crypto";

export function esewaConfig() {
  const mode = process.env.ESEWA_MODE || "test";
  if (!["test", "production"].includes(mode)) throw new Error("Invalid ESEWA_MODE");
  const production = mode === "production";
  const productCode = process.env.ESEWA_PRODUCT_CODE || (production ? "" : "EPAYTEST");
  const secret = process.env.ESEWA_SECRET_KEY || (production ? "" : "8gBm/:&EnhH.1/q(");
  if (!productCode || !secret) throw new Error("eSewa merchant credentials are required");
  const clientUrl = new URL(process.env.CLIENT_URL || "http://localhost:5173");
  if (production && clientUrl.protocol !== "https:") throw new Error("Production CLIENT_URL must use HTTPS");
  return { mode, productCode, secret, clientUrl,
    formUrl: production ? "https://epay.esewa.com.np/api/epay/main/v2/form" : "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: production ? "https://epay.esewa.com.np/api/epay/transaction/status/" : "https://rc.esewa.com.np/api/epay/transaction/status/",
  };
}

export function paymentForm(order, config = esewaConfig()) {
  if (order.esewaMode !== config.mode || order.productCode !== config.productCode) {
    throw new Error("Order belongs to a different eSewa configuration");
  }
  const callback = (result) => {
    const url = new URL(config.clientUrl);
    url.searchParams.set("order", String(order._id));
    url.searchParams.set("payment", result);
    return url.href;
  };
  const fields = {
    amount: order.amount.toFixed(2), tax_amount: "0", total_amount: order.amount.toFixed(2),
    transaction_uuid: order.transactionUuid, product_code: order.productCode,
    product_service_charge: "0", product_delivery_charge: "0",
    success_url: callback("return"), failure_url: callback("cancelled"),
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };
  fields.signature = createHmac("sha256", config.secret)
    .update(fields.signed_field_names.split(",").map(key => `${key}=${fields[key]}`).join(","))
    .digest("base64");
  return { action: config.formUrl, fields, mode: config.mode };
}

export async function verifyPayment(order, fetchImpl = fetch) {
  const config = esewaConfig();
  if (order.esewaMode !== config.mode || order.productCode !== config.productCode) {
    throw new Error("Order belongs to a different eSewa configuration");
  }
  const url = new URL(config.statusUrl);
  url.search = new URLSearchParams({ product_code: order.productCode,
    total_amount: order.amount.toFixed(2), transaction_uuid: order.transactionUuid });
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("eSewa verification unavailable");
  const data = await response.json();
  if (!data || data.error_message || typeof data.status !== "string") {
    throw new Error("eSewa verification unavailable");
  }
  if (data.status !== "COMPLETE") return null;
  // ePay documents both naming variants for status responses.
  const reference = data.ref_id ?? data.refId;
  if ((data.transaction_uuid ?? data.pid) !== order.transactionUuid ||
      (data.product_code ?? data.scd) !== order.productCode ||
      Number(data.total_amount ?? data.totalAmount) !== order.amount || !reference) {
    throw new Error("eSewa transaction details do not match the order");
  }
  return String(reference);
}
