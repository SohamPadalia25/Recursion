import { ApiError } from "../utils/ApiError.js";

// checks instructor OR admin (admins can do everything instructors can)
const isInstructor = (req, res, next) => {
    if (req.user.role !== "instructor" && req.user.role !== "admin") {
        throw new ApiError(403, "Instructor access required");
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Admin access required");
    }
    next();
};

export { isInstructor, isAdmin };