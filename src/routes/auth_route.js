import express from "express";

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

router.post("/register", register);

router.post("/login", login);

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