// Helpers for the current Bilibili WBI-signed web API.
// Spec: https://socialsisteryi.github.io/bilibili-API-collect/docs/misc/sign/wbi.html
// Character shuffle table
const MIXIN_KEY_ENC_TAB = [
  46,
  47,
  18,
  2,
  53,
  8,
  23,
  32,
  15,
  50,
  10,
  31,
  58,
  3,
  45,
  35,
  27,
  43,
  5,
  49,
  33,
  9,
  42,
  19,
  29,
  28,
  14,
  39,
  12,
  38,
  41,
  13,
  37,
  48,
  7,
  16,
  24,
  55,
  40,
  61,
  26,
  17,
  0,
  1,
  60,
  51,
  30,
  4,
  22,
  25,
  54,
  21,
  56,
  59,
  6,
  63,
  57,
  62,
  11,
  36,
  20,
  34,
  44,
  52,
]

// Pure JS MD5 — no external deps, safe for service worker bundling
function md5(input: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xFFFF)
  }
  function rol(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s))
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t)
  }

  // Encode string to UTF-8 bytes
  const utf8: number[] = []
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i)
    if (c < 0x80) {
      utf8.push(c)
    }
    else if (c < 0x800) {
      utf8.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F))
    }
    else if (c < 0xD800 || c >= 0xE000) {
      utf8.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F))
    }
    else {
      i++
      c = 0x10000 + (((c & 0x3FF) << 10) | (input.charCodeAt(i) & 0x3FF))
      utf8.push(
        0xF0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3F),
        0x80 | ((c >> 6) & 0x3F),
        0x80 | (c & 0x3F),
      )
    }
  }

  const len8 = utf8.length * 8
  const m: number[] = []
  for (let i = 0; i < utf8.length * 8; i += 8)
    m[i >> 5] = (m[i >> 5] || 0) | ((utf8[i / 8] & 0xFF) << (i % 32))
  m[len8 >> 5] = (m[len8 >> 5] || 0) | (0x80 << (len8 % 32))
  m[(((len8 + 64) >>> 9) << 4) + 14] = len8

  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878

  for (let i = 0; i < m.length; i += 16) {
    const aa = a
    const bb = b
    const cc = c
    const dd = d
    const w = (j: number) => m[i + j] || 0

    a = ff(a, b, c, d, w(0), 7, -680876936)
    d = ff(d, a, b, c, w(1), 12, -389564586)
    c = ff(c, d, a, b, w(2), 17, 606105819)
    b = ff(b, c, d, a, w(3), 22, -1044525330)
    a = ff(a, b, c, d, w(4), 7, -176418897)
    d = ff(d, a, b, c, w(5), 12, 1200080426)
    c = ff(c, d, a, b, w(6), 17, -1473231341)
    b = ff(b, c, d, a, w(7), 22, -45705983)
    a = ff(a, b, c, d, w(8), 7, 1770035416)
    d = ff(d, a, b, c, w(9), 12, -1958414417)
    c = ff(c, d, a, b, w(10), 17, -42063)
    b = ff(b, c, d, a, w(11), 22, -1990404162)
    a = ff(a, b, c, d, w(12), 7, 1804603682)
    d = ff(d, a, b, c, w(13), 12, -40341101)
    c = ff(c, d, a, b, w(14), 17, -1502002290)
    b = ff(b, c, d, a, w(15), 22, 1236535329)
    a = gg(a, b, c, d, w(1), 5, -165796510)
    d = gg(d, a, b, c, w(6), 9, -1069501632)
    c = gg(c, d, a, b, w(11), 14, 643717713)
    b = gg(b, c, d, a, w(0), 20, -373897302)
    a = gg(a, b, c, d, w(5), 5, -701558691)
    d = gg(d, a, b, c, w(10), 9, 38016083)
    c = gg(c, d, a, b, w(15), 14, -660478335)
    b = gg(b, c, d, a, w(4), 20, -405537848)
    a = gg(a, b, c, d, w(9), 5, 568446438)
    d = gg(d, a, b, c, w(14), 9, -1019803690)
    c = gg(c, d, a, b, w(3), 14, -187363961)
    b = gg(b, c, d, a, w(8), 20, 1163531501)
    a = gg(a, b, c, d, w(13), 5, -1444681467)
    d = gg(d, a, b, c, w(2), 9, -51403784)
    c = gg(c, d, a, b, w(7), 14, 1735328473)
    b = gg(b, c, d, a, w(12), 20, -1926607734)
    a = hh(a, b, c, d, w(5), 4, -378558)
    d = hh(d, a, b, c, w(8), 11, -2022574463)
    c = hh(c, d, a, b, w(11), 16, 1839030562)
    b = hh(b, c, d, a, w(14), 23, -35309556)
    a = hh(a, b, c, d, w(1), 4, -1530992060)
    d = hh(d, a, b, c, w(4), 11, 1272893353)
    c = hh(c, d, a, b, w(7), 16, -155497632)
    b = hh(b, c, d, a, w(10), 23, -1094730640)
    a = hh(a, b, c, d, w(13), 4, 681279174)
    d = hh(d, a, b, c, w(0), 11, -358537222)
    c = hh(c, d, a, b, w(3), 16, -722521979)
    b = hh(b, c, d, a, w(6), 23, 76029189)
    a = hh(a, b, c, d, w(9), 4, -640364487)
    d = hh(d, a, b, c, w(12), 11, -421815835)
    c = hh(c, d, a, b, w(15), 16, 530742520)
    b = hh(b, c, d, a, w(2), 23, -995338651)
    a = ii(a, b, c, d, w(0), 6, -198630844)
    d = ii(d, a, b, c, w(7), 10, 1126891415)
    c = ii(c, d, a, b, w(14), 15, -1416354905)
    b = ii(b, c, d, a, w(5), 21, -57434055)
    a = ii(a, b, c, d, w(12), 6, 1700485571)
    d = ii(d, a, b, c, w(3), 10, -1894986606)
    c = ii(c, d, a, b, w(10), 15, -1051523)
    b = ii(b, c, d, a, w(1), 21, -2054922799)
    a = ii(a, b, c, d, w(8), 6, 1873313359)
    d = ii(d, a, b, c, w(15), 10, -30611744)
    c = ii(c, d, a, b, w(6), 15, -1560198380)
    b = ii(b, c, d, a, w(13), 21, 1309151649)
    a = ii(a, b, c, d, w(4), 6, -145523070)
    d = ii(d, a, b, c, w(11), 10, -1120210379)
    c = ii(c, d, a, b, w(2), 15, 718787259)
    b = ii(b, c, d, a, w(9), 21, -343485551)

    a = safeAdd(a, aa)
    b = safeAdd(b, bb)
    c = safeAdd(c, cc)
    d = safeAdd(d, dd)
  }

  return [a, b, c, d]
    .map(n => Array.from({ length: 4 }, (_, i) => ((n >> (i * 8)) & 0xFF).toString(16).padStart(2, '0')).join(''))
    .join('')
}

/**
 * Generate mixin_key from img_key and sub_key
 */
export function getMixinKey(imgKey: string, subKey: string): string {
  const rawWbiKey = imgKey + subKey
  return MIXIN_KEY_ENC_TAB
    .map(n => rawWbiKey[n])
    .join('')
    .slice(0, 32)
}

/**
 * Encode params with WBI signature
 * @param params - Request parameters
 * @param imgKey - img_key from /x/web-interface/nav
 * @param subKey - sub_key from /x/web-interface/nav
 * @param timestamp - Unix timestamp in seconds (defaults to current time)
 */
export function encodeWbi(
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string,
  timestamp: number = Math.round(Date.now() / 1000),
): Record<string, string | number> {
  const mixinKey = getMixinKey(imgKey, subKey)
  const wts = timestamp

  const filteredParams: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params))
    filteredParams[k] = String(v).replace(/[!'()*]/g, '')

  const paramsWithWts: Record<string, string | number> = { ...filteredParams, wts }

  const query = Object.keys(paramsWithWts)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(paramsWithWts[k])}`)
    .join('&')

  const w_rid = md5(query + mixinKey)

  return { ...paramsWithWts, w_rid }
}

/**
 * Build a ready-to-use query string using exactly the same encoding as the
 * `w_rid` computation.
 *
 * `URLSearchParams` encodes a space as `+` while `encodeURIComponent` emits
 * `%20`. Sending a query built with the former while signing with the latter
 * makes Bilibili reject the signature. Always send what this returns.
 */
export function buildWbiQuery(
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string,
  timestamp?: number,
): string {
  const signed = encodeWbi(params, imgKey, subKey, timestamp)
  return Object.keys(signed)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(signed[k]))}`)
    .join('&')
}

export interface WbiKeys {
  imgKey: string
  subKey: string
}

function keyFromUrl(url: unknown): string {
  if (typeof url !== 'string')
    return ''
  const start = url.lastIndexOf('/') + 1
  const end = url.lastIndexOf('.')
  return end > start ? url.slice(start, end) : ''
}

/**
 * Read WBI keys from `/x/web-interface/nav`.
 * Bilibili still returns `data.wbi_img` when `code === -101` (not logged in),
 * so the HTTP status / envelope code is intentionally not checked here.
 */
export function extractWbiKeys(nav: unknown): WbiKeys | null {
  const wbiImg = (nav as { data?: { wbi_img?: { img_url?: unknown, sub_url?: unknown } } } | null)?.data?.wbi_img
  const imgKey = keyFromUrl(wbiImg?.img_url)
  const subKey = keyFromUrl(wbiImg?.sub_url)
  return imgKey && subKey ? { imgKey, subKey } : null
}

export interface NormalizedRcmd {
  code: number
  message: string
  data: {
    item: unknown[]
    [key: string]: unknown
  }
}

/**
 * Normalize a `/wbi/index/top/feed/rcmd` payload.
 *
 * On rate limiting / WAF challenges Bilibili answers with an HTML 412 page or
 * a JSON envelope whose `data` has no `item`. Returning a stable shape here
 * keeps the homepage from throwing (and from retrying forever) in those cases.
 */
export function normalizeRcmdResponse(payload: unknown, fallbackMessage = 'Invalid response'): NormalizedRcmd {
  const empty = (): NormalizedRcmd => ({ code: -1, message: fallbackMessage, data: { item: [] } })
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return empty()

  const raw = payload as Record<string, unknown>
  const rawData = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : {}

  return {
    code: typeof raw.code === 'number' ? raw.code : -1,
    message: typeof raw.message === 'string' ? raw.message : fallbackMessage,
    data: {
      ...rawData,
      item: Array.isArray(rawData.item) ? rawData.item : [],
    },
  }
}
