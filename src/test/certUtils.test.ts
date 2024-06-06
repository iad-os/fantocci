import { describe, it, expect } from 'vitest';
import { createCertificate } from '../certUtils.js';
describe('OAuth2 Test Suite', () => {
  it('create certs', async () => {
    const crts = await createCertificate({
      cert: { domains: ['localhost'], validity: 365, organization: 'IAD Srl' },
    });
    expect(crts).toBeDefined();
  });
});
