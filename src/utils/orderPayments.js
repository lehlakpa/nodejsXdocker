import Order from "../models/Order_model.js";
import { verifyPayment } from "./esewa.js";

export async function reconcileOrder(order) {
  if (order.paymentMethod !== "esewa" || order.paymentStatus === "paid") return order;
  const reference = await verifyPayment(order);
  if (!reference) return order;
  const filter = { _id: order._id, buyer: order.buyer };
  return await Order.findOneAndUpdate({ ...filter, paymentStatus: "pending" },
    { $set: { paymentStatus: "paid", reference, paidAt: new Date() } }, { new: true })
    ?? await Order.findOne(filter);
}
