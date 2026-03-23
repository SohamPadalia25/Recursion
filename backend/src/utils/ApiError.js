class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.error = errors;
    this.success = false;
  }
}

export { ApiError };

