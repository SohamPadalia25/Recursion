import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const verifyJWT = async (req, res, next) => {
  try {
    // login sets cookies: accessToken / refreshToken
    const token =
      req.cookies?.accessToken ||
      req.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) throw new ApiError(401, "Unauthorized request");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded?._id;
    if (!userId) throw new ApiError(401, "Unauthorized request");

    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) throw new ApiError(401, "Unauthorized request");

    req.user = user;
    next();
  } catch (err) {
    // Normalize all auth failures into ApiError for the global error handler.
    const message = err?.message || "Unauthorized request";
    next(err instanceof ApiError ? err : new ApiError(401, message));
  }
};

export { verifyJWT };

