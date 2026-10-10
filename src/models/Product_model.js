import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    images: {
      type: [{ url: { type: String, required: true }, publicId: { type: String, required: true }, _id: false }],
      default: [],
      validate: { validator: images => images.length <= 3, message: "A product can have at most 3 images." }
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ owner: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 });
export default mongoose.model("Product", productSchema);
