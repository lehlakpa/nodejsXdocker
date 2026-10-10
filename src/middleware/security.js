import { rateLimit } from "express-rate-limit";

export function browserWriteGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const referer = req.get("referer");
  const trusted = new URL(process.env.CLIENT_URL || "http://localhost:5173").origin;
  let source;
  try { source = origin || (referer ? new URL(referer).origin : undefined); } catch { source = "invalid"; }
  if ((source && source !== trusted) || (!source && (req.get("sec-fetch-site") === "cross-site" ||
      (process.env.NODE_ENV === "production" && req.get("cookie"))))) {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }
  next();
}

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30,
  standardHeaders: "draft-8", legacyHeaders: false, skipSuccessfulRequests: true,
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." } });
export const paymentLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10,
  standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Please wait a minute before checking payments again." } });

let uploads = 0;
export function limitConcurrentUploads(req, res, next) {
  if (!req.is("multipart/form-data")) return next();
  if (uploads >= 4) return res.status(503).json({ message: "Uploads are busy. Please try again shortly." });
  uploads++;
  let released = false;
  const release = () => { if (!released) { released = true; uploads--; } };
  res.once("finish", release);
  res.once("close", release);
  next();
}
