import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth_route.js";
import productRoutes from "./routes/product_route.js";

import {
  errorHandler
} from "./middleware/error_middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());

app.use(cookieParser());

app.get("/", (req, res) => {
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

app.use(errorHandler);

export default app;