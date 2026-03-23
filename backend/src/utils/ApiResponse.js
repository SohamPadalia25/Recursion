class ApiResponse {
  constructor(statusCode, data = null, message = "Request successful") {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
  }
}

export { ApiResponse };

