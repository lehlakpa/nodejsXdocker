import Product from "../models/Product_model.js";
import { cache, productCacheScope, storefrontCacheScope } from "../utils/cache.js";
import { uploadImages, removeImages, retainedImages } from "../utils/productImages.js";


// CREATE
export const createProduct = async (
  req,
  res,
  next
) => {
  let uploaded = [];
  let saved = false;
  try {
    const {
      title,
      description,
      price
    } = req.body ?? {};

    if (typeof title !== "string" || !title.trim() || typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "A title and a non-negative numeric price are required"
      });
    }

    uploaded = await uploadImages(req.files);
    const product = await Product.create({
      title,
      description,
      price,
      owner: req.user.userId,
      images: uploaded
    });
    saved = true;

    await Promise.all([cache.invalidate(productCacheScope(req.user.userId)), cache.invalidate(storefrontCacheScope)]);

    return res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    if (!saved) await removeImages(uploaded);
    return next(error);
  }
};


// READ ALL
export const getProducts = async (
  req,
  res,
  next
) => {
  try {
    const products = await cache.remember(productCacheScope(req.user.userId), "list", () => Product.find({
      owner: req.user.userId
    }).sort({
      createdAt: -1
    }));

    return res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    return next(error);
  }
};


// READ ONE
export const getProduct = async (
  req,
  res,
  next
) => {
  try {
    const product = await cache.remember(productCacheScope(req.user.userId), `item:${req.params.id}`, () => Product.findOne({
      _id: req.params.id,
      owner: req.user.userId
    }));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    return next(error);
  }
};


// UPDATE
export const updateProduct = async (
  req,
  res,
  next
) => {
  let uploaded = [];
  let saved = false;
  try {
    let previous;
    let images;
    const fields = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key]) => ["title", "description", "price"].includes(key)));
    if ((fields.title !== undefined && (typeof fields.title !== "string" || !fields.title.trim())) ||
        (fields.price !== undefined && (typeof fields.price !== "number" || !Number.isFinite(fields.price) || fields.price < 0))) {
      return res.status(400).json({ message: "A title and a non-negative numeric price are required" });
    }
    if (req.files?.length || req.body?.retainedImages !== undefined) {
      previous = await Product.findOne({ _id: req.params.id, owner: req.user.userId });
      if (!previous) return res.status(404).json({ message: "Product not found" });
      const retained = retainedImages(req.body.retainedImages, previous.images);
      if (retained.length + (req.files?.length || 0) > 3) return res.status(400).json({ message: "Keep at most 3 images per product." });
      uploaded = await uploadImages(req.files);
      images = [...retained, ...uploaded];
      fields.images = images;
    }
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user.userId,
        ...(previous ? { __v: previous.__v } : {})
      },
      { $set: fields, $inc: { __v: 1 } },
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      await removeImages(uploaded);
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    saved = true;
    if (previous) await removeImages(previous.images.filter(image => !images.some(kept => kept.publicId === image.publicId)));

    await Promise.all([cache.invalidate(productCacheScope(req.user.userId)), cache.invalidate(storefrontCacheScope)]);

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    if (!saved) await removeImages(uploaded);
    return next(error);
  }
};


// DELETE
export const deleteProduct = async (
  req,
  res,
  next
) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await removeImages(product.images);
    await Promise.all([cache.invalidate(productCacheScope(req.user.userId)), cache.invalidate(storefrontCacheScope)]);

    return res.status(200).json({
      success: true,
      message: "Product deleted"
    });
  } catch (error) {
    return next(error);
  }
};
