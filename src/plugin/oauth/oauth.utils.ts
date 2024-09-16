import { nanoid } from "nanoid";
import { AccessTokenLikeRFC9068, FantocciFakerProps } from "./oauth.types";

export function extractToken(token: string): string {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('invalid token');
  return payload;
}

export function decodeToken(b64Payload: string): string {
  return Buffer.from(b64Payload, 'base64').toString();
}

export function buildToken(payload: unknown): string {
  const header = toBase64({
    alg: 'RS256',
    typ: 'JWT',
    kid: 'k12345',
  });
  const payloadB64 = toBase64(payload);
  const signature = toBase64('fake-signature-simulation');
  return `${header}.${payloadB64}.${signature}`;
}

function toBase64(toConvert: unknown): string {
  return Buffer.from(JSON.stringify(toConvert)).toString('base64');
}

export function expiresIn(secondsFromNow: number): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

export function expireIn60(): number {
  return expiresIn(60);
}

export function issuedAt(secondsBeforeNow: number): number {
  return Math.floor((Date.now() - 501) / 1000) - secondsBeforeNow;
}

export function issueNow(): number {
  return issuedAt(0);
}

export function jwtId(): string {
  return nanoid();
}

export function buildFakeAccessToken(
  accessToken: AccessTokenLikeRFC9068 & { [key: string]: unknown },
  fantocciFakerProps: FantocciFakerProps
): string {
  return buildToken({
    ...accessToken,
    additional_fake_props: fantocciFakerProps,
  });
}
