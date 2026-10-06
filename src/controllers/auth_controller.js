import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User_model.js";

import {
  digestRefreshToken,
  generateAccessToken,
  generateRefreshToken
} from "../utils/token.js";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
  };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const options = getCookieOptions();

  res.cookie("accessToken", accessToken, {
    ...options,
    maxAge: 15 * 60 * 1000
  });

  res.cookie("refreshToken", refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};


// =======================
// REGISTER
// =======================

export const register = async (req, res, next) => {
  try {
    const {
      fullName,
      username,
      password
    } = req.body ?? {};

    if (typeof fullName !== "string" || !fullName.trim() || typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, username and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const normalizedUsername = username
      .trim()
      .toLowerCase();

    const existingUser = await User.findOne({
      username: normalizedUsername
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const user = await User.create({
      fullName,
      username: normalizedUsername,
      password: hashedPassword
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username
      }
    });
  } catch (error) {
    return next(error);
  }
};


// =======================
// LOGIN
// =======================

export const login = async (req, res, next) => {
  try {
    const {
      username,
      password
    } = req.body ?? {};

    if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    const user = await User.findOne({
      username: username.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    // Store hashed refresh token
    const refreshTokenHash = await bcrypt.hash(
      digestRefreshToken(refreshToken),
      10
    );

    user.refreshTokenHash = refreshTokenHash;

    await user.save();

    setAuthCookies(
      res,
      accessToken,
      refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username
      }
    });
  } catch (error) {
    return next(error);
  }
};


// =======================
// REFRESH TOKEN
// =======================

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken =
      req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing"
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    const user = await User.findById(
      decoded.userId
    );

    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh session"
      });
    }

    const tokenMatched = await bcrypt.compare(
      digestRefreshToken(refreshToken),
      user.refreshTokenHash
    );

    if (!tokenMatched) {
      return res.status(401).json({
        success: false,
        message: "Refresh token does not match"
      });
    }

    // Generate fresh tokens
    const newAccessToken =
      generateAccessToken(user);

    const newRefreshToken =
      generateRefreshToken(user);

    // Refresh token rotation
    user.refreshTokenHash = await bcrypt.hash(
      digestRefreshToken(newRefreshToken),
      10
    );

    await user.save();

    setAuthCookies(
      res,
      newAccessToken,
      newRefreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully"
    });
  } catch (error) {
    return next(error);
  }
};


// =======================
// GET CURRENT USER
// =======================

export const getMe = async (req, res, next) => {
  try {
    const user = await User
      .findById(req.user.userId)
      .select("-password -refreshTokenHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return next(error);
  }
};


// =======================
// LOGOUT
// =======================

export const logout = async (req, res, next) => {
  try {
    const refreshToken =
      req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );

        await User.findByIdAndUpdate(
          decoded.userId,
          {
            refreshTokenHash: null
          }
        );
      } catch {
        // Cookie may already be expired.
    }
    }

    const options = getCookieOptions();

    res.clearCookie("accessToken", options);

    res.clearCookie("refreshToken", options);

    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    return next(error);
  }
};