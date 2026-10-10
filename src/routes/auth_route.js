import express from "express";
import { authLimiter } from "../middleware/security.js";

import {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe
} from "../controllers/auth_controller.js";

import {
  protect
} from "../middleware/auth_middleware.js";

const router = express.Router();

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.post(
  "/refresh",
  refreshAccessToken
);

router.post(
  "/logout",
  logout
);

router.get(
  "/me",
  protect,
  getMe
);

export default router;
