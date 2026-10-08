import "dotenv/config";

import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { connectRedis, closeRedis } from "./src/config/redis.js";
import mongoose from "mongoose";

const PORT =
  process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  connectRedis();

  const server = app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}`
    );
  });

  const shutdown = () => {
    server.close(async () => {
      closeRedis();
      await mongoose.disconnect();
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

startServer().catch((error) => {
  console.error("Startup failed:", error.message);
  closeRedis();
  process.exit(1);
});
