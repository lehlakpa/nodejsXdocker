const express = require("express");
const { createClient } = require("redis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { title } = require("node:process");

const app = express();

app.use(express.json());

// Redis connection
const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redis.on("error", (error) => {
  const details = error.errors?.map((cause) => cause.message).join("; ");
  console.error("Redis error:", details || error.message || error.code);
});

// Demo data: आफ्नो project मा MongoDB प्रयोग गर
const products = [
  { id: 1, title: "Keyboard", price: 1500 },
  { id: 2, title: "Mouse", price: 800 },
  {id:2,title:"mouse",price:400}
];

const CACHE_KEY = "demo:products";

// GET products: cache बाट वा data source बाट
app.get("/api/products", async (req, res, next) => {
  try {
    const cachedProducts = await redis.get(CACHE_KEY);

    // Cache hit
    if (cachedProducts !== null) {
      return res.json({
        source: "cache",
        products: JSON.parse(cachedProducts),
      });
    }

    // Cache miss
    // MongoDB भए:
    // const data = await Product.find().lean();
    const data = products;

    await redis.set(
      CACHE_KEY,
      JSON.stringify(data),
      { EX: 60 } // 60 seconds TTL
    );

    return res.json({
      source: "data-source",
      products: data,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH product: update + cache invalidate
app.patch("/api/products/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { price } = req.body ?? {};

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        message: "Price must be a non-negative number",
      });
    }

    const product = products.find((item) => item.id === id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // पहिले data update गर
    product.price = price;

    // त्यसपछि पुरानो cache हटाऊ
    await redis.del(CACHE_KEY);

    return res.json({
      message: "Product updated; cache cleared",
      product,
    });
  } catch (error) {
    next(error);
  }
});

// Central error handler
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    message: "Server error",
  });
});

async function startServer() {
  // पहिले Redis connect गर
  await redis.connect();

  console.log("Redis connected");

  // त्यसपछि मात्र rate limiter बनाऊ
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      sendCommand: (...args) => redis.sendCommand(args),
      prefix: "demo:rate-limit:",
    }),

    message: {
      message: "too many  request wait a minute",
    },
  });

  // अलग wrapper: limiter पहिले, पुरानो app त्यसपछि
  const server = express();

  server.use("/api", apiLimiter);
  server.use(app);
  
  server.listen(3000, "127.0.0.1", () => {
    console.log("Server: http://localhost:3000");
  });
}

startServer().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
