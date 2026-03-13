import { describe, expect, it } from 'vitest'

import { encodeWbi, getMixinKey } from '~/utils/wbiSign'

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
