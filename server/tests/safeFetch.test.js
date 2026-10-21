import { describe, it, expect } from 'vitest';
import { checkUrl, isPrivateAddress, UnsafeUrlError } from '../services/safeFetch.js';

describe('safe fetching', () => {
  it('knows which addresses the public internet cannot route to', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it('accepts a public page, adding https when the scheme is missing', () => {
    expect(checkUrl('example.com/bread').toString()).toBe('https://example.com/bread');
    expect(checkUrl('http://example.com/').protocol).toBe('http:');
  });

  it('refuses other schemes, odd ports, credentials and private literals', () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com', 'http://example.com:8080', 'http://user:pw@example.com', 'http://10.0.0.1/', 'http://[fd00::1]/']) {
      expect(() => checkUrl(url), url).toThrow(UnsafeUrlError);
    }
  });
});
