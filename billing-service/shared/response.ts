export const formatResponse = (statusCode: number, body: any, headers?: any) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*", // or your frontend URL
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...headers,
  },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
