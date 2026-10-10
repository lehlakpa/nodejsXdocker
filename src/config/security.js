export function validateSecurityConfig(env = process.env) {
  if (env.NODE_ENV !== "production") return;
  const secrets = [env.ACCESS_TOKEN_SECRET, env.REFRESH_TOKEN_SECRET];
  if (secrets.some(secret => !secret || Buffer.byteLength(secret) < 32 || secret.startsWith("replace-")) || secrets[0] === secrets[1]) {
    throw new Error("Production requires separate, strong access and refresh token secrets.");
  }
  if (!env.CLIENT_URL || new URL(env.CLIENT_URL).protocol !== "https:") throw new Error("Production CLIENT_URL must use HTTPS.");
  if (env.ALLOW_REGISTRATION === "true") throw new Error("Disable public admin registration before production startup.");
  if (env.ESEWA_MODE !== "production" || !env.ESEWA_SECRET_KEY || !env.ESEWA_PRODUCT_CODE || env.ESEWA_PRODUCT_CODE === "EPAYTEST") {
    throw new Error("Production requires live eSewa merchant configuration.");
  }
}
