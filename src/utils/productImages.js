import { v2 as cloudinary } from "cloudinary";

function configure() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw Object.assign(new Error("Image uploads are not configured on the server."), { status: 503 });
  }
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
}

export async function removeImages(images = []) {
  if (!images.length) return;
  try {
    configure();
    const results = await Promise.allSettled(images.map(image => cloudinary.uploader.destroy(image.publicId, { resource_type: "image", invalidate: true })));
    if (results.some(result => result.status === "rejected")) console.warn("Some product images could not be removed from Cloudinary.");
  } catch { console.warn("Product image cleanup is unavailable."); }
}

export async function uploadImages(files = []) {
  if (!files.length) return [];
  configure();
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "stockroom/products", resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"], timeout: 60000 }, (error, image) => error ? reject(error) : resolve(image));
        stream.on("error", reject);
        stream.end(file.buffer);
      });
      uploaded.push({ url: result.secure_url, publicId: result.public_id });
    }
    return uploaded;
  } catch {
    await removeImages(uploaded);
    throw Object.assign(new Error("Images could not be uploaded. Use valid JPG, PNG or WebP images and try again."), { status: 502 });
  }
}

export function retainedImages(value, existing = []) {
  if (value === undefined) return existing;
  let ids;
  try { ids = JSON.parse(value); } catch { /* handled below */ }
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length ||
      ids.some(id => !existing.some(image => image.publicId === id))) {
    throw Object.assign(new Error("Invalid product image selection."), { status: 400 });
  }
  return ids.map(id => existing.find(image => image.publicId === id));
}
