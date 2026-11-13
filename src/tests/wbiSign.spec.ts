import { describe, expect, it } from 'vitest'

import { buildWbiQuery, encodeWbi, extractWbiKeys, getMixinKey, normalizeRcmdResponse } from '~/utils/wbiSign'

// Known test vectors from bilibili-API-collect
// img_key: 7cd084941338484aae1ad9425b84077c
// sub_key: 4932caff0ff746eab6f01bf08b70ac45
// Expected mixin_key: ea1db124af3c7062474693fa704f4ff8
const IMG_KEY = '7cd084941338484aae1ad9425b84077c'
const SUB_KEY = '4932caff0ff746eab6f01bf08b70ac45'
const EXPECTED_MIXIN_KEY = 'ea1db124af3c7062474693fa704f4ff8'

describe('getMixinKey', () => {
  it('generates correct mixin_key from img_key and sub_key', () => {
    const result = getMixinKey(IMG_KEY, SUB_KEY)
    expect(result).toBe(EXPECTED_MIXIN_KEY)
  })

  it('returns a 32-character string', () => {
    const result = getMixinKey(IMG_KEY, SUB_KEY)
    expect(result).toHaveLength(32)
  })
})

describe('encodeWbi', () => {
  it('adds w_rid and wts to params', () => {
    const params = { foo: '114', bar: '514', zab: '1919810' }
    const result = encodeWbi(params, IMG_KEY, SUB_KEY, 1702204169)
    expect(result).toHaveProperty('w_rid')
    expect(result).toHaveProperty('wts', 1702204169)
  })

  it('generates correct w_rid for known input', () => {
    // Verified via Node.js crypto md5 with known keys and params
    const params = { foo: '114', bar: '514', zab: '1919810' }
    const result = encodeWbi(params, IMG_KEY, SUB_KEY, 1702204169)
    expect(result.w_rid).toBe('8f6f2b5b3d485fe1886cec6a0be8c5d4')
  })

  it('filters out reserved characters from param values', () => {
    const params = { test: 'hello!\'()*world' }
    const result = encodeWbi(params, IMG_KEY, SUB_KEY, 1702204169)
    // reserved chars should be stripped
    expect(result).toHaveProperty('w_rid')
  })
})

describe('buildWbiQuery', () => {
  it('uses the same encoding as the signature (space -> %20, not +)', () => {
    const query = buildWbiQuery({ foo: 'hello world' }, IMG_KEY, SUB_KEY, 1702204169)
    expect(query).toContain('foo=hello%20world')
    expect(query).not.toContain('+')
  })

  it('produces a w_rid matching the known test vector', () => {
    const query = buildWbiQuery({ foo: '114', bar: '514', zab: '1919810' }, IMG_KEY, SUB_KEY, 1702204169)
    const parsed = new URLSearchParams(query)
    expect(parsed.get('w_rid')).toBe('8f6f2b5b3d485fe1886cec6a0be8c5d4')
    expect(parsed.get('wts')).toBe('1702204169')
  })

  it('strips reserved characters from values in the outgoing query', () => {
    const query = buildWbiQuery({ test: 'hello!\'()*world' }, IMG_KEY, SUB_KEY, 1702204169)
    expect(new URLSearchParams(query).get('test')).toBe('helloworld')
  })
})

describe('extractWbiKeys', () => {
  const nav = (img: string, sub: string, code = 0) => ({
    code,
    message: 'OK',
    data: { wbi_img: { img_url: img, sub_url: sub } },
  })
  const goodUrl = (key: string) => `https://i0.hdslb.com/bfs/wbi/${key}.png`
  const keys = { imgKey: IMG_KEY, subKey: SUB_KEY }

  const cases: Array<[string, unknown, typeof keys | null]> = [
    ['normal logged-in nav', nav(goodUrl(IMG_KEY), goodUrl(SUB_KEY)), keys],
    ['code -101 (not logged in) still carries wbi_img', nav(goodUrl(IMG_KEY), goodUrl(SUB_KEY), -101), keys],
    ['missing wbi_img', { code: 0, data: {} }, null],
    ['null payload', null, null],
    ['malformed urls without extension', nav('no-extension', 'also-bad'), null],
  ]

  it.each(cases)('%s', (_name, payload, expected) => {
    expect(extractWbiKeys(payload)).toEqual(expected)
  })
})

describe('normalizeRcmdResponse', () => {
  const cases: Array<[string, unknown, number, number]> = [
    ['valid feed', { code: 0, message: 'OK', data: { item: [{ id: 1 }], mid: 123 } }, 0, 1],
    ['risk control envelope', { code: -352, message: '风控', data: null }, -352, 0],
    ['code 0 but item missing', { code: 0, message: 'OK', data: {} }, 0, 0],
    ['HTML 412 WAF page', '<!DOCTYPE html><html></html>', -1, 0],
    ['null payload', null, -1, 0],
    ['array payload', [], -1, 0],
  ]

  it.each(cases)('%s -> code=%i, item=%i', (_name, payload, code, itemCount) => {
    const result = normalizeRcmdResponse(payload)
    expect(result.code).toBe(code)
    expect(result.data.item).toHaveLength(itemCount)
  })

  it('preserves extra fields from data', () => {
    const result = normalizeRcmdResponse({ code: 0, data: { item: [], mid: 42 } })
    expect(result.data.mid).toBe(42)
  })
})
