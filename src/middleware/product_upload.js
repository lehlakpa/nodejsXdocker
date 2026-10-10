import multer from "multer";

export const productUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 3, fileSize: 5 * 1024 * 1024, fields: 4, fieldSize: 10000, parts: 7 },
  fileFilter(req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(Object.assign(new Error("Only JPG, PNG and WebP images are supported."), { status: 400 }));
    }
    callback(null, true);
  },
}).array("images", 3);

export function normalizeProductForm(req, res, next) {
  if (req.is("multipart/form-data") && req.body?.price !== undefined) {
    req.body.price = typeof req.body.price !== "string" || req.body.price.trim() === "" ? NaN : Number(req.body.price);
  }
  next();
}
