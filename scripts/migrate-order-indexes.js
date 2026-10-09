import "dotenv/config";
import mongoose from "mongoose";
import Order from "../src/models/Order_model.js";

// The previous checkout used requestId. Missing requestId values collide in its
// non-sparse unique index. Preserve every order and remove only that obsolete index.
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await Order.createIndexes();
  const indexes = await Order.collection.indexes();
  const legacy = indexes.find(index => index.name === "requestId_1" &&
    index.key.requestId === 1 && Object.keys(index.key).length === 1);
  if (legacy) {
    await Order.collection.dropIndex(legacy.name);
    console.log("Removed obsolete requestId index. All orders preserved.");
  } else {
    console.log("Order indexes are already up to date.");
  }
} catch (error) {
  console.error("Order index migration failed:", error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
