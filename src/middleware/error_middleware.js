export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let message = err.message || "Internal Server Error";
  if (err.name === "ValidationError" || err.name === "CastError") {
    status = 400;
  }
  if (err.code === 11000) {
    status = 409;
    message = "Username already exists";
  }
  if (status >= 500) {
    console.error(err);
    message = "Internal Server Error";
  }

  res.status(status).json({
    success: false,
    message
  });
};
