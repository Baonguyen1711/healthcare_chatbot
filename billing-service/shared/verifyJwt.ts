import jwt, { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient, { JwksClient, SigningKey } from "jwks-rsa";

const client: JwksClient = jwksClient({
  jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_3YfJifhBe/.well-known/jwks.json`
});

console.log("client", client)


// Get public key for the specific `kid`
function getKey(header: JwtHeader, callback: SigningKeyCallback): void {
  console.log("getKey called with header:", header);

  if (!header.kid) {
    console.error("No `kid` in JWT header!");
    return callback(new Error("Missing kid"), undefined);
  }

  client.getSigningKey(header.kid as string, (err: Error | null, key?: SigningKey) => {
    if (err) {
      console.error("Error fetching signing key from JWKS:", err);
      return callback(err, undefined);
    }

    if (!key) {
      console.error("No signing key returned from JWKS for kid:", header.kid);
      return callback(new Error("No signing key"), undefined);
    }

    const signingKey = key.getPublicKey();
    console.log("Got signing key for kid:", header.kid);
    callback(null, signingKey);
  });
}


export function verifyToken<T = any>(token: string): Promise<T> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as T);
    });
  });
}
