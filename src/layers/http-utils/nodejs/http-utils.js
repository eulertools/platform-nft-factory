/**
 * @param { any } event
 */
const getHeaders = (event) => {

  let origin = event.headers?.origin;

  if(origin && origin.length > 0 && origin.slice(-1) === '/') origin = origin.slice(0, -1);

  let headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
    "Access-Control-Allow-Credentials": true,
  };

  console.log('Allow-Origin', headers["Access-Control-Allow-Origin"]);

  return headers;
};

 /**
   * @param {any} err
   */
const handleError = (err) => {

  let statusCode;
  let body;

  console.log(err);
  
  if(err instanceof ValidationError) {
    statusCode = err.statusCode;
    body = new Response(err.statusCode, err.message);

  } else {
    statusCode = 500;
    body = new Response(statusCode, 'Internal server error');
  }

  return { body, statusCode };
}
class Response {

  /**
   * @param {number} statusCode
   * @param {string} description
   * @param {any} payload
   */
  constructor(statusCode, description, payload=undefined) {
    this.statusCode = statusCode;
    this.description = description;
    if(payload) this.payload = payload;
  }
}

class ValidationError extends Error {
  
  error;
  statusCode;

  /**
   * @param {number} statusCode
   * @param {string} error
   * @param {string} message
   */
  constructor(statusCode, error, message) {
      super(message);
      this.error = error;
      this.statusCode = statusCode;
  }
};
  
exports.getHeaders = getHeaders;
exports.handleError = handleError;
exports.Response = Response;
exports.ValidationError = ValidationError;