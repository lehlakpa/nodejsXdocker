import express from "express";
import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import Product from "../models/Product_model.js";
import Order from "../models/Order_model.js";
import { esewaConfig, paymentForm } from "../utils/esewa.js";
import { reconcileOrder } from "../utils/orderPayments.js";
import { cache, storefrontCacheScope } from "../utils/cache.js";

const router = express.Router();
const hash = value => createHash("sha256").update(value).digest("hex");
const receipt = order => ({ _id: order._id, title: order.title, amount: order.amount,
  quantity: order.quantity, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus });
router.get("/products", async (req, res, next) => {
  try {
    const products = await cache.remember(storefrontCacheScope, "list", () => Product.find({}).select("title description price images.url").sort({ createdAt: -1 }).lean());
    res.json({ products });
  } catch (error) { next(error); }
});
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }));
router.post("/orders", async (req, res, next) => {
  try {
    const { productId, paymentMethod, requestKey, customer, quantity } = req.body ?? {};
    if (!mongoose.isValidObjectId(productId) || !["cash", "esewa"].includes(paymentMethod) ||
        typeof requestKey !== "string" || !/^[a-f0-9-]{36}$/.test(requestKey) ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100 ||
        typeof customer?.name !== "string" || customer.name.trim().length < 2 || customer.name.length > 100 ||
        typeof customer?.phone !== "string" || !/^\+?[0-9 ()-]{7,20}$/.test(customer.phone) || customer.phone.replace(/\D/g, "").length < 7 ||
        typeof customer?.address !== "string" || customer.address.trim().length < 5 || customer.address.length > 500) {
      return res.status(400).json({ message: "Enter your name, valid phone number, delivery address and quantity (1–100)." });
    }
    const guestTokenHash = hash(requestKey);
    let order = await Order.findOne({ guestTokenHash });
    const details = { name: customer.name.trim(), phone: customer.phone.trim(), address: customer.address.trim() };
    if (!order) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product is no longer available." });
      const cents = Math.round(product.price * 100) * quantity;
      if (!Number.isSafeInteger(cents) || cents < 0 || (paymentMethod === "esewa" && cents === 0)) {
        return res.status(400).json({ message: "Invalid total. Select Cash for free products." });
      }
      const config = paymentMethod === "esewa" ? esewaConfig() : null;
      try {
        // The product owner manages incoming guest orders through the existing workspace.
        order = await Order.create({ buyer: product.owner, product: product._id, title: product.title,
          amount: cents / 100, quantity, customer: details, requestKey, guestTokenHash,
          paymentMethod, transactionUuid: randomUUID(), productCode: config?.productCode, esewaMode: config?.mode });
      } catch (error) {
        if (error.code !== 11000) throw error;
        order = await Order.findOne({ guestTokenHash });
        if (!order) throw error;
      }
    }
    if (String(order.product) !== productId || order.paymentMethod !== paymentMethod || order.quantity !== quantity ||
        Object.keys(details).some(key => order.customer?.[key] !== details[key])) {
      return res.status(409).json({ message: "This checkout was already submitted with different details. Close it and start a new order." });
    }
    res.status(201).json({ order: receipt(order), payment: paymentMethod === "esewa" && order.paymentStatus !== "paid" ? paymentForm(order) : null });
  } catch (error) { next(error); }
});
router.post("/orders/:id/verify", async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (!mongoose.isValidObjectId(req.params.id) || typeof token !== "string" || token.length !== 36) {
      return res.status(404).json({ message: "Order not found on this device." });
    }
    let order = await Order.findOne({ _id: req.params.id, guestTokenHash: hash(token) });
    if (!order) return res.status(404).json({ message: "Order not found on this device." });
    if (order.paymentMethod === "esewa" && order.paymentStatus !== "paid") {
      try { order = await reconcileOrder(order); }
      catch { return res.status(502).json({ message: "Payment verification is unavailable. Check again shortly before paying again." }); }
    }
    res.json({ order: receipt(order) });
  } catch (error) { next(error); }
});
export default router;
