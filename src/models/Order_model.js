import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ["cash", "esewa"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
  transactionUuid: { type: String, required: true, unique: true },
  requestKey: { type: String, required: true },
  guestTokenHash: { type: String, select: false },
  customer: { name: String, phone: String, address: String },
  quantity: { type: Number, min: 1, max: 100, default: 1 },
  productCode: String,
  esewaMode: String,
  reference: String,
  paidAt: Date,
}, { timestamps: true });
orderSchema.index({ buyer: 1, requestKey: 1 }, { unique: true });
orderSchema.index({ guestTokenHash: 1 }, { sparse: true });
orderSchema.index({ buyer: 1, createdAt: -1, _id: -1 });
orderSchema.index({ buyer: 1, paymentMethod: 1, paymentStatus: 1, createdAt: -1 });
export default mongoose.model("Order", orderSchema);
