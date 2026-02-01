import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("Missing env: JWT_SECRET");

const key = new TextEncoder().encode(secret);

export type SessionPayload = {
  uid: string; // user id
};

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, key);
  return payload as any as SessionPayload;
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return [
    `HttpOnly`,
    `Path=/`,
    `SameSite=Lax`,
    isProd ? `Secure` : ``,
    `Max-Age=${60 * 60 * 24 * 30}`,
  ].filter(Boolean).join("; ");
}
