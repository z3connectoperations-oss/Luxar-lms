import { createRemoteJWKSet, jwtVerify } from "jose";

// Google's public keys for Firebase ID tokens, in JWKS format.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface FirebaseClaims {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Verify a Firebase ID token: checks RS256 signature against Google's keys,
 * issuer = securetoken/<project>, audience = <project>, and expiry.
 * Throws if invalid — the client can never self-assert identity.
 */
export async function verifyFirebaseToken(
  idToken: string,
  projectId: string
): Promise<FirebaseClaims> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) throw new Error("token missing subject");
  const email = (payload.email as string) ?? "";
  if (!email) throw new Error("token missing email");

  return {
    uid: payload.sub,
    email,
    name: (payload.name as string) || email.split("@")[0],
    picture: payload.picture as string | undefined,
    emailVerified: Boolean(payload.email_verified),
  };
}
