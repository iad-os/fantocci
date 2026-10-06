import 'reflect-metadata';
import { webcrypto } from 'node:crypto';
import { isIP } from 'node:net';
import * as x509 from '@peculiar/x509';

export type Certificate = {
  key: string;
  cert: string;
};

export type CertificateAuthorityOptions = {
  organization: string;
  countryCode: string;
  state: string;
  locality: string;
  /** Validity in days. */
  validity: number;
};

export type CertificateOptions = {
  domains: string[];
  /** Validity in days. */
  validity: number;
  organization?: string;
  email?: string;
};

const DEFAULT_CA: CertificateAuthorityOptions = {
  countryCode: 'IT',
  locality: 'Rome',
  organization: 'IAD Srl',
  state: 'Italy',
  validity: 365,
};

const ALGORITHM = {
  name: 'RSASSA-PKCS1-v1_5',
  hash: 'SHA-256',
  publicExponent: new Uint8Array([
    1,
    0,
    1,
  ]),
  modulusLength: 2048,
} satisfies webcrypto.RsaHashedKeyGenParams;

function validityWindow(days: number) {
  const notBefore = new Date();
  const notAfter = new Date(notBefore);
  notAfter.setDate(notAfter.getDate() + days);
  return {
    notBefore,
    notAfter,
  };
}

function serialNumber() {
  // Positive, non-zero 16-byte serial as required by RFC 5280.
  const bytes = webcrypto.getRandomValues(new Uint8Array(16));
  bytes.set([
    ((bytes[0] ?? 0) & 0x7f) | 0x01,
  ]);
  return Buffer.from(bytes).toString('hex');
}

async function exportKey(key: webcrypto.CryptoKey) {
  const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', key);
  return x509.PemConverter.encode(pkcs8, 'PRIVATE KEY');
}

async function createCA(options: CertificateAuthorityOptions) {
  const keys = await webcrypto.subtle.generateKey(ALGORITHM, true, [
    'sign',
    'verify',
  ]);
  const name = `CN=${options.organization}, C=${options.countryCode}, ST=${options.state}, L=${options.locality}, O=${options.organization}`;
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: serialNumber(),
    name,
    ...validityWindow(options.validity),
    keys,
    signingAlgorithm: ALGORITHM,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  });
  return {
    cert,
    privateKey: keys.privateKey,
  };
}

async function createLeaf(options: CertificateOptions, ca: Awaited<ReturnType<typeof createCA>>) {
  const keys = await webcrypto.subtle.generateKey(ALGORITHM, true, [
    'sign',
    'verify',
  ]);
  const [commonName] = options.domains;
  const subject = [
    `CN=${commonName}`,
    options.organization ? `O=${options.organization}` : undefined,
    options.email ? `E=${options.email}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  const cert = await x509.X509CertificateGenerator.create({
    serialNumber: serialNumber(),
    subject,
    issuer: ca.cert.subject,
    ...validityWindow(options.validity),
    publicKey: keys.publicKey,
    signingKey: ca.privateKey,
    signingAlgorithm: ALGORITHM,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment, true),
      new x509.ExtendedKeyUsageExtension([
        x509.ExtendedKeyUsage.serverAuth,
        x509.ExtendedKeyUsage.clientAuth,
      ]),
      new x509.SubjectAlternativeNameExtension(
        options.domains.map((value) => ({
          type: isIP(value) ? 'ip' : 'dns',
          value,
        })),
      ),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
      await x509.AuthorityKeyIdentifierExtension.create(ca.cert),
    ],
  });
  return {
    cert,
    privateKey: keys.privateKey,
  };
}

export type CreateCertificateOptions = {
  /** Overrides for the generated (self-signed) certificate authority. */
  ca?: Partial<CertificateAuthorityOptions>;
  /** Leaf certificate options; the CA is supplied automatically. */
  cert: CertificateOptions;
};

/** Generate a throw-away CA plus a leaf certificate signed by it (development only). */
export async function createCertificate({ ca, cert }: CreateCertificateOptions): Promise<{
  ca: Certificate;
  certs: Certificate;
}> {
  const authority = await createCA({
    ...DEFAULT_CA,
    ...ca,
  });
  const leaf = await createLeaf(cert, authority);
  return {
    ca: {
      cert: authority.cert.toString('pem'),
      key: await exportKey(authority.privateKey),
    },
    certs: {
      cert: leaf.cert.toString('pem'),
      key: await exportKey(leaf.privateKey),
    },
  };
}
