const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Express should provide `next`, but in case it isn't (e.g. handler arity quirks),
      // return a consistent JSON error instead of throwing "next is not a function".
      if (typeof next === "function") return next(err);

      const statusCode = err?.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: err?.message || "Internal server error",
        errors: err?.error || [],
      });
    });
  };
};

export default asyncHandler;

