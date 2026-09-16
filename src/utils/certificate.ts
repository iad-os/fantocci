import { type CertificateAuthorityOptions, type CertificateOptions, createCA, createCert } from 'mkcert';

const DEFAULT_CA: CertificateAuthorityOptions = {
  countryCode: 'IT',
  locality: 'Rome',
  organization: 'IAD Srl',
  state: 'Italy',
  validity: 365,
};

export type CreateCertificateOptions = {
  /** Overrides for the generated (self-signed) certificate authority. */
  ca?: Partial<CertificateAuthorityOptions>;
  /** Leaf certificate options; `ca` is supplied automatically. */
  cert: Omit<CertificateOptions, 'ca'>;
};

/** Generate a throw-away CA plus a leaf certificate signed by it (development only). */
export async function createCertificate({ ca, cert }: CreateCertificateOptions) {
  const caCerts = await createCA({
    ...DEFAULT_CA,
    ...ca,
  });
  const certs = await createCert({
    ...cert,
    ca: caCerts,
  });
  return {
    ca: caCerts,
    certs,
  };
}
