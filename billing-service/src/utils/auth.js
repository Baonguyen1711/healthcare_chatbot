const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
    jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_3YfJifhBe/.well-known/jwks.json`
});

// Get public key for the specific `kid`
function getKey(header, callback) {
    console.log("getKey called with header:", header);

    if (!header.kid) {
        console.error("No `kid` in JWT header!");
        return callback(new Error("Missing kid"), undefined);
    }

    client.getSigningKey(header.kid, (err, key) => {
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

function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
            if (err) return reject(err);
            resolve(decoded);
        });
    });
}

const formatResponse = (statusCode, body, headers) => ({
    statusCode,
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
});

const withAuth = (handler) => {
    return async (event) => {
        try {
            const authHeader = event.headers?.authorization || event.headers?.Authorization;
            if (!authHeader) {
                return formatResponse(401, { message: "Missing Authorization header" });
            }

            const token = authHeader.split(" ")[1];
            const decoded = await verifyToken(token);

            const userId = decoded.sub;
            if (!userId) {
                return formatResponse(401, { message: "Invalid token payload" });
            }

            // Call the actual handler and pass userId
            return await handler(event, userId);
        } catch (err) {
            return formatResponse(401, { message: "Unauthorized", detail: err.message });
        }
    };
};

module.exports = { withAuth, verifyToken, formatResponse };
