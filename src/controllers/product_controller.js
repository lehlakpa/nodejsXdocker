import Product from "../models/Product_model.js";
import { cache, productCacheScope } from "../utils/cache.js";


// CREATE
export const createProduct = async (
  req,
  res,
  next
) => {
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

    const product = await Product.create({
      title,
      description,
      price,
      owner: req.user.userId
    });

    await cache.invalidate(productCacheScope(req.user.userId));

    return res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
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
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user.userId
      },
      { $set: Object.fromEntries(
        Object.entries(req.body ?? {}).filter(([key]) =>
          ["title", "description", "price"].includes(key)
        )
      ) },
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await cache.invalidate(productCacheScope(req.user.userId));

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
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

    await cache.invalidate(productCacheScope(req.user.userId));

    return res.status(200).json({
      success: true,
      message: "Product deleted"
    });
  } catch (error) {
    return next(error);
  }
};
