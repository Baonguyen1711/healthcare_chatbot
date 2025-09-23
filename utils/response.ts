export const formatResponse = (statusCode: number, body: any) => ({
  statusCode,
  body: typeof body === "string" ? body : JSON.stringify(body),
});
