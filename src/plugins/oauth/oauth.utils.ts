import { nanoid } from 'nanoid';
import type { AccessTokenLikeRFC9068, FantocciFakerProps } from './oauth.types.js';

/** Return the (base64url) payload segment of a compact JWT. */
export function extractToken(token: string): string {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('invalid token');
  return payload;
}

/** Decode a base64/base64url JWT segment to its JSON string. */
export function decodeToken(b64Payload: string): string {
  return Buffer.from(b64Payload, 'base64url').toString('utf8');
}

/** Decode the payload of a compact JWT without verifying its signature. */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T {
  return JSON.parse(decodeToken(extractToken(token))) as T;
}

function toBase64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Build an unsigned JWT-shaped token (`header.payload.fake-signature`). */
export function buildToken(payload: unknown): string {
  const header = toBase64Url({
    alg: 'RS256',
    typ: 'JWT',
    kid: 'k12345',
  });
  const signature = toBase64Url('fake-signature-simulation');
  return `${header}.${toBase64Url(payload)}.${signature}`;
}

export function expiresIn(secondsFromNow: number): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

export function expireIn60(): number {
  return expiresIn(60);
}

export function issuedAt(secondsBeforeNow: number): number {
  return Math.floor(Date.now() / 1000) - secondsBeforeNow;
}

export function issueNow(): number {
  return issuedAt(0);
}

export function jwtId(): string {
  return nanoid();
}

/** Build a fake access token whose introspection behaviour is driven by `fakerProps`. */
export function buildFakeAccessToken(
  accessToken: AccessTokenLikeRFC9068 & Record<string, unknown>,
  fakerProps: FantocciFakerProps,
): string {
  return buildToken({
    ...accessToken,
    additional_fake_props: fakerProps,
  });
}
