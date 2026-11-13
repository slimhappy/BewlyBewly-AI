import type { WbiKeys } from '../../../utils/wbiSign'
import { buildWbiQuery, extractWbiKeys, normalizeRcmdResponse } from '../../../utils/wbiSign'
import type { APIMAP } from '../../utils'
import { AHS } from '../../utils'

const API_ORIGIN = 'https://api.bilibili.com'
const NAV_URL = `${API_ORIGIN}/x/web-interface/nav`
const RCMD_URL = `${API_ORIGIN}/x/web-interface/wbi/index/top/feed/rcmd`
const WBI_KEY_TTL = 30 * 60 * 1000
const REQUEST_TIMEOUT = 10_000

// Chrome attaches `Origin: chrome-extension://<id>` to cross-origin requests
// made from the MV3 service worker. Bilibili's WAF replies HTTP 412 to that
// origin, so assets/rules.json rewrites Origin/Referer for EVERY api.bilibili.com
// XHR (GET included). `referrer` is set here too for engines that honour it.
async function fetchJson(url: string): Promise<unknown> {
  const path = new URL(url).pathname
  const res = await fetch(url, {
    referrer: 'https://www.bilibili.com/',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })
  const text = await res.text()
  if (!res.ok)
    throw new Error(`HTTP ${res.status} from ${path}`)
  try {
    return JSON.parse(text)
  }
  catch {
    throw new Error(`Non-JSON response (HTTP ${res.status}) from ${path}`)
  }
}

// WBI keys rotate daily; avoid an extra nav round-trip on every scroll/refresh.
let cachedWbiKeys: { keys: WbiKeys, fetchedAt: number } | null = null

async function getWbiKeys(): Promise<WbiKeys> {
  if (cachedWbiKeys && Date.now() - cachedWbiKeys.fetchedAt < WBI_KEY_TTL)
    return cachedWbiKeys.keys
  const keys = extractWbiKeys(await fetchJson(NAV_URL))
  if (!keys)
    throw new Error('WBI keys missing from nav response')
  cachedWbiKeys = { keys, fetchedAt: Date.now() }
  return keys
}

const API_VIDEO = {
  getRecommendVideos: async (message: any) => {
    try {
      const { imgKey, subKey } = await getWbiKeys()
      const query = buildWbiQuery({
        fresh_idx: message.fresh_idx ?? 1,
        feed_version: 'V8',
        fresh_type: 4,
        ps: message.ps ?? 30,
        plat: 1,
        web_location: 1430650,
      }, imgKey, subKey)

      return normalizeRcmdResponse(await fetchJson(`${RCMD_URL}?${query}`))
    }
    catch (e) {
      // Never reject: a rejected message makes the homepage retry forever and
      // leaves its skeleton screens spinning. Force a key refresh next time.
      cachedWbiKeys = null
      return {
        code: -1,
        message: e instanceof Error ? e.message : String(e),
        data: { item: [] },
      }
    }
  },
  getAppRecommendVideos: {
    url: 'https://app.bilibili.com/x/v2/feed/index',
    _fetch: {
      method: 'get',
    },
    params: {
      build: 74800100,
      device: 'pad',
      mobi_app: 'iphone',
      c_locate: 'CN',
      s_locale: 'zh-CN',
      idx: 0,
      appkey: '27eb53fc9058f8c3',
      access_key: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/indefined/UserScripts/blob/master/bilibiliHome/bilibiliHome.API.md#%E6%8F%90%E4%BA%A4%E4%B8%8D%E5%96%9C%E6%AC%A2
  dislikeVideo: {
    url: 'https://app.bilibili.com/x/feed/dislike',
    _fetch: {
      method: 'get',
    },
    params: {
      access_key: '',
      goto: '',
      id: 0,
      idx: '',
      reason_id: 1,
      device: '',
      mobi_app: '',
      build: 0,
      appkey: '',
      sign: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/indefined/UserScripts/blob/master/bilibiliHome/bilibiliHome.API.md#%E6%92%A4%E9%94%80%E4%B8%8D%E5%96%9C%E6%AC%A2
  undoDislikeVideo: {
    url: 'https://app.bilibili.com/x/feed/dislike/cancel',
    _fetch: {
      method: 'get',
    },
    params: {
      access_key: '',
      goto: '',
      id: 0,
      idx: 0,
      reason_id: 1,
      device: '',
      mobi_app: '',
      build: 0,
      sign: '',
      appkey: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://socialsisteryi.github.io/bilibili-API-collect/docs/video/info.html#%E8%8E%B7%E5%8F%96%E8%A7%86%E9%A2%91%E8%AF%A6%E7%BB%86%E4%BF%A1%E6%81%AF-web%E7%AB%AF
  getVideoInfo: {
    url: 'https://api.bilibili.com/x/web-interface/view',
    _fetch: {
      method: 'get',
    },
    params: {
      aid: '',
      bvid: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/list.md#%E8%8E%B7%E5%8F%96%E8%AF%84%E8%AE%BA%E5%8C%BA%E6%98%8E%E7%BB%86_%E7%BF%BB%E9%A1%B5%E5%8A%A0%E8%BD%BD
  getVideoComments: {
    url: 'https://api.bilibili.com/x/v2/reply',
    _fetch: {
      method: 'get',
    },
    params: {
      csrf: '',
      type: 1,
      oid: 0,
      sort: 0,
      nohot: 0,
      pn: 1,
      ps: 20,
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/SocialSisterYi/bilibili-API-collect/blob/def57d7a70ed1f39080069ba0f40648ce6ce2b90/docs/video_ranking/popular.md#%E8%8E%B7%E5%8F%96%E5%BD%93%E5%89%8D%E7%83%AD%E9%97%A8%E8%A7%86%E9%A2%91%E5%88%97%E8%A1%A8
  getPopularVideos: {
    url: 'https://api.bilibili.com/x/web-interface/popular',
    _fetch: {
      method: 'get',
    },
    params: {
      pn: 1,
      ps: 20,
    },
    afterHandle: AHS.J_D,
  },
  // https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#%E8%8E%B7%E5%8F%96%E8%A7%86%E9%A2%91%E6%B5%81%E5%9C%B0%E5%9D%80-web%E7%AB%AF
  getVideoPreview: {
    url: 'https://api.bilibili.com/x/player/wbi/playurl',
    _fetch: {
      method: 'get',
    },
    params: {
      qn: 32,
      fnver: 0,
      fnval: 1,
      bvid: '',
      cid: 0,
    },
    afterHandle: AHS.J_D,
  },
} satisfies APIMAP

export default API_VIDEO
