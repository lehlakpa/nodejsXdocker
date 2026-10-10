import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { browserWriteGuard } from "./middleware/security.js";

import authRoutes from "./routes/auth_route.js";
import productRoutes from "./routes/product_route.js";
import orderRoutes from "./routes/order_route.js";
import storeRoutes from "./routes/store_route.js";

import {
  errorHandler
} from "./middleware/error_middleware.js";

const app = express();
app.disable("x-powered-by");
// Only trust the explicitly configured proxy network, never arbitrary client headers.
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(browserWriteGuard);
app.use(express.json({ limit: "32kb" }));

app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API running"
  });
});

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use("/api/orders", orderRoutes);
app.use("/api/store", storeRoutes);
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, code: "API_ROUTE_NOT_FOUND", message: "This API endpoint is unavailable. Please check that the backend is up to date." });
});
app.use(errorHandler);

export default app;
