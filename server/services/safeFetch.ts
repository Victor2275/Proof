/*
 * Fetching a page someone else named.
 *
 * "Import from a URL" makes the server fetch an address a user typed. Without
 * a guard that is a way to make the server read what only it can reach — the
 * cloud metadata service, a database on localhost, the private network. So:
 *
 *   - only http and https, on their default ports;
 *   - every address the name resolves to must be public, checked at connect
 *     time (inside the socket's own DNS lookup) so a name cannot resolve to a
 *     public address for the check and a private one for the connection;
 *   - redirects are followed by hand, each one checked the same way;
 *   - a time limit and a size limit, so a slow or enormous page costs nothing.
 */
import dns from 'dns';
import net from 'net';
import axios from 'axios';

export class UnsafeUrlError extends Error {}

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 4;

/** True for any address the public internet cannot route to. */
export function isPrivateAddress(address: string): boolean {
  let ip = address.toLowerCase();
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) ip = mapped[1];

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast and reserved
    );
  }
  if (net.isIPv6(ip)) {
    return (
      ip === '::' || ip === '::1' ||
      ip.startsWith('fc') || ip.startsWith('fd') || // unique local
      ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb') || // link-local
      ip.startsWith('ff') // multicast
    );
  }
  return true;
}

/** A DNS lookup that refuses to hand a private address to the socket. */
const guardedLookup: typeof dns.lookup = ((hostname: string, options: any, callback: any) => {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? {} : options;
  dns.lookup(hostname, { ...opts, all: true }, (err, addresses: dns.LookupAddress[]) => {
    if (err) return cb(err);
    const bad = addresses.find((a) => isPrivateAddress(a.address));
    if (bad || addresses.length === 0) return cb(new UnsafeUrlError("That address isn't a public web page."));
    if (opts.all) return cb(null, addresses);
    cb(null, addresses[0].address, addresses[0].family);
  });
}) as typeof dns.lookup;

export function checkUrl(raw: string): URL {
  // Any other scheme is refused outright, not read as a host name.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw) && !/^[^:/]+:\d+/.test(raw)) {
    throw new UnsafeUrlError('Only http and https pages can be imported.');
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new UnsafeUrlError("That isn't a web address.");
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('Only http and https pages can be imported.');
  if (url.port && url.port !== '80' && url.port !== '443') throw new UnsafeUrlError("That address isn't a public web page.");
  if (url.username || url.password) throw new UnsafeUrlError("That address isn't a public web page.");
  // A literal IP skips DNS, so it is checked here.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isPrivateAddress(host)) throw new UnsafeUrlError("That address isn't a public web page.");
  return url;
}

/** Fetches a public page as text, or throws UnsafeUrlError / a network error. */
export async function fetchPublicPage(raw: string): Promise<{ url: string; html: string }> {
  let url = checkUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await axios.get(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProofRecipeImport/1.0)' },
      lookup: guardedLookup,
      maxRedirects: 0,
      timeout: TIMEOUT_MS,
      maxContentLength: MAX_BYTES,
      responseType: 'text',
      validateStatus: (s) => s < 400 || (s >= 300 && s < 400),
    } as any);
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      url = checkUrl(new URL(res.headers.location, url).toString());
      continue;
    }
    return { url: url.toString(), html: String(res.data) };
  }
  throw new UnsafeUrlError('That page redirects too many times.');
}
