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
  productCode: String,
  esewaMode: String,
  reference: String,
  paidAt: Date,
}, { timestamps: true });
orderSchema.index({ buyer: 1, requestKey: 1 }, { unique: true });
export default mongoose.model("Order", orderSchema);
