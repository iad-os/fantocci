import {
  CertificateAuthorityOptions,
  CertificateOptions,
  createCA,
  createCert,
} from 'mkcert';

export async function createCertificate({
  ca = {
    countryCode: 'IT',
    locality: 'Rome',
    organization: 'IAD Srl',
    state: 'Italy',
    validity: 365,
  },
  cert = {
    domains: ['localhost', 'lo.iad2.cloud', '*.lo.iad2.cloud'],
    validity: 365,
    organization: 'IAD Srl',
  },
}: {
  ca?: Partial<CertificateAuthorityOptions>;
  cert: Omit<CertificateOptions, 'ca'>;
}) {
  const caCerts = await createCA({
    countryCode: 'IT',
    locality: 'Rome',
    organization: 'IAD Srl',
    state: 'Italy',
    validity: 365,
    ...ca,
  });
  const certs = await createCert({
    ...cert,
    ca: caCerts,
  });

  return { ca: caCerts, certs };
}
