import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Order from "../models/Order_model.js";
import Product from "../models/Product_model.js";
import { protect } from "../middleware/auth_middleware.js";
import { esewaConfig, paymentForm } from "../utils/esewa.js";
import { reconcileOrder } from "../utils/orderPayments.js";

const router = express.Router();
router.use(protect);
router.post("/sync", async (req, res, next) => {
  try {
    // Bounded parallel checks finish within the provider timeout. Keep failures
    // pending and still allow order history to load when eSewa is unavailable.
    const pending = await Order.find({ buyer: req.user.userId, paymentMethod: "esewa", paymentStatus: "pending" })
      .sort({ createdAt: -1 }).limit(20);
    const results = await Promise.allSettled(pending.map(reconcileOrder));
    res.json({ checked: pending.length,
      paid: results.filter(result => result.status === "fulfilled" && result.value?.paymentStatus === "paid").length,
      unavailable: results.filter(result => result.status === "rejected").length });
  } catch (error) { next(error); }
});
router.get("/", async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const { method, status } = req.query;
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 ||
        (method && !["cash", "esewa"].includes(method)) ||
        (status && !["pending", "paid"].includes(status))) {
      return res.status(400).json({ message: "Invalid order filters" });
    }
    const filter = { buyer: req.user.userId,
      ...(method ? { paymentMethod: method } : {}), ...(status ? { paymentStatus: status } : {}) };
    const orders = await Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21);
    res.json({ orders: orders.slice(0, 20), hasMore: orders.length > 20 });
  } catch (error) { next(error); }
});
router.post("/:id/cash-paid", async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, buyer: req.user.userId, paymentMethod: "cash" };
    // The workspace records cash receipt manually; online payments can only be verified.
    let order = await Order.findOneAndUpdate({ ...filter, paymentStatus: "pending" },
      { $set: { paymentStatus: "paid", paidAt: new Date() } }, { new: true });
    order ??= await Order.findOne(filter);
    if (!order) return res.status(404).json({ message: "Cash order not found" });
    res.json({ order });
  } catch (error) { next(error); }
});
router.post("/", async (req, res, next) => {
  try {
    const { productId, paymentMethod, requestKey } = req.body ?? {};
    if (!mongoose.isValidObjectId(productId) || !["cash", "esewa"].includes(paymentMethod) ||
        typeof requestKey !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) {
      return res.status(400).json({ message: "Choose a product and Cash or eSewa payment." });
    }
    const filter = { buyer: req.user.userId, requestKey };
    let order = await Order.findOne(filter);
    if (!order) {
      const product = await Product.findOne({ _id: productId, owner: req.user.userId });
      if (!product) return res.status(404).json({ message: "Product not found" });
      const amount = Math.round(product.price * 100) / 100;
      if (!Number.isSafeInteger(Math.round(product.price * 100)) || amount < 0 || (paymentMethod === "esewa" && amount <= 0)) {
        return res.status(400).json({ message: "eSewa requires a positive, valid product price. Use Cash for free products." });
      }
      const config = paymentMethod === "esewa" ? esewaConfig() : null;
      try {
        order = await Order.create({ ...filter, product: product._id, title: product.title, amount,
          paymentMethod, transactionUuid: randomUUID(), productCode: config?.productCode, esewaMode: config?.mode });
      } catch (error) {
        if (error.code !== 11000) throw error;
        order = await Order.findOne(filter);
        if (!order) throw error;
      }
    }
    if (String(order.product) !== productId || order.paymentMethod !== paymentMethod) {
      return res.status(409).json({ message: "This checkout was already used for a different order." });
    }
    res.status(201).json({ order, payment: order.paymentMethod === "esewa" && order.paymentStatus !== "paid" ? paymentForm(order) : null });
  } catch (error) { next(error); }
});
router.get("/:id", async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyer: req.user.userId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (error) { next(error); }
});
router.post("/:id/verify", async (req, res, next) => {
  try {
    let order = await Order.findOne({ _id: req.params.id, buyer: req.user.userId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod === "esewa" && order.paymentStatus !== "paid") {
      try { order = await reconcileOrder(order); }
      catch { return res.status(502).json({ message: "Could not verify eSewa payment. Please check again shortly; do not pay again." }); }
    }
    res.json({ order });
  } catch (error) { next(error); }
});
export default router;
