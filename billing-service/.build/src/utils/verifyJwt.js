"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const client = (0, jwks_rsa_1.default)({
    jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_3YfJifhBe/.well-known/jwks.json`
});
console.log("client", client);
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
        jsonwebtoken_1.default.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
            if (err)
                return reject(err);
            resolve(decoded);
        });
    });
}
