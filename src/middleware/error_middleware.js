export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let message = err.message || "Internal Server Error";
  if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller." : "Upload up to 3 images in the images field.";
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    status = 400;
  }
  if (err.code === 11000) {
    status = 409;
    message = err.keyPattern?.username
      ? "Username already exists"
      : "A record with these details already exists. Please retry your request.";
  }
  if (status >= 500) {
    console.error(err.name || "ServerError");
    if (status !== 502 && status !== 503) message = "Internal Server Error";
  }

  res.status(status).json({
    success: false,
    message
  });
};
