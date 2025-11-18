import jwt, { JwtHeader } from "jsonwebtoken";
import jwksClient, { JwksClient, SigningKey } from "jwks-rsa";

// === Setup JWKS client exactly like your shared file ===
const client: JwksClient = jwksClient({
  jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_3YfJifhBe/.well-known/jwks.json`,
});

// === Your getKey function ===
function getKey(header: JwtHeader, callback: (err: Error | null, key?: string) => void) {
  console.log("getKey called with header:", header);
  if (!header.kid) return callback(new Error("Missing kid"));

  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    if (!key) return callback(new Error("No signing key"));

    console.log("Successfully got signing key for kid:", header.kid);
    callback(null, key.getPublicKey());
  });
}

// === Your verifyToken function ===
async function verifyToken(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

// === Main test ===
(async () => {
  const token = "eyJraWQiOiI5NnBIbXdlZzVKXC9neUcyak03and3Yit0ZEdQM3VnSGZsNEdxeFJFV1lnMD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI1NGY4OTQ2OC1jMDMxLTcwMmYtZjE1Zi0zZDU2MWFlNzQ0NGUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV8zWWZKaWZoQmUiLCJjbGllbnRfaWQiOiI2cTBrbGhyNDNnbDV2NWhkZjJtN3IwcjBrbiIsIm9yaWdpbl9qdGkiOiI4YzVhMDBkYS1hNDJiLTQ2OTktOTA2Ny01N2ZjYjk1MDBiMGMiLCJldmVudF9pZCI6IjgwMjMzYmVmLTRjNWYtNGU4YS04ZjMyLWU5Y2EyZGQ3YjZhMCIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NjM0NTY1OTksImV4cCI6MTc2MzQ2MDE5OSwiaWF0IjoxNzYzNDU2NTk5LCJqdGkiOiI3MTEwNmQxZi0yOWE4LTQxMGUtOTkyOS01MjU5YTI3MzU1ZjYiLCJ1c2VybmFtZSI6IjU0Zjg5NDY4LWMwMzEtNzAyZi1mMTVmLTNkNTYxYWU3NDQ0ZSJ9.XtBhPxa5BQrOOsbjnoZZPpod0jd4KKyA6YWWa1GlMkZIUmJYm3vI0bMcNujgNEC70ADZJr8_T5Vf9rZcRJbz8FwO4Pdahqp4Ro6fbKNrcw1KAomttJTz7Avww1SgHEeSkl12xdAyM_0wXq4UB3x6rNzsocalJ72NenrpVQFUzZPAidEoQ0Py77FYnNajeBEx7Rx-tGR0jSp4cAhtDYpxt4REOu0gi8AmQFXtNO_bVm2gup37MxRqgzh8cwg6MIW6abvUTalzxV4wQ0vEe6eVAHtQ_BBlqTXc82YKxn8w0DjI-E-uL-0zDzk9D5AOyAWKLtBItpvcIvanUJd9BfwaSQ"; // no "Bearer ", just the JWT
  try {
    const decoded = await verifyToken(token);
    console.log("Verified payload:", decoded);
  } catch (err) {
    console.error("Verification failed:", err);
  }
})();
