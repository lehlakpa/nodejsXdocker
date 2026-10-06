import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";

// bcrypt truncates input at 72 bytes; digest the entire JWT before hashing it.
export const digestRefreshToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE || "15m"
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d",
      jwtid: randomUUID()
    }
  );
};
