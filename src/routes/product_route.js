import express from "express";

import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct
} from "../controllers/product_controller.js";

import {
  protect
} from "../middleware/auth_middleware.js";

const router = express.Router();

// सबै तलका route मा authentication चाहिन्छ
router.use(protect);

router.post("/", createProduct);

router.get("/", getProducts);

router.get("/:id", getProduct);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;