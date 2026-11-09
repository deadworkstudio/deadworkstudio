// deadwork-hq/src/socialStats.ts
// Daniel (2026-11-09): the morning email should show Instagram, YouTube and TikTok numbers for
// @deadworkstudio. Each platform is optional: it only shows once its key/token secret is set, and
// a failure on one never stops the email. Yesterday's numbers are kept in KV so the email can say
// "+12 since yesterday".

export interface SocialEnv {
  NOTIFY_SIGNUPS: KVNamespace
  /** Google Cloud API key with "YouTube Data API v3" enabled (public numbers only, no login). */
  YOUTUBE_API_KEY?: string
  /** Defaults to @deadworkstudio. */
  YOUTUBE_HANDLE?: string
  /** Instagram API with Instagram Login: a long-lived user token for a Business/Creator account.
   *  Refreshed automatically (stored in KV) so it doesn't lapse after 60 days. */
  INSTAGRAM_TOKEN?: string
  /** TikTok Login Kit app (scopes user.info.basic, user.info.stats). The refresh token lasts a
   *  year and is rotated in KV; access tokens (24 h) are fetched each run. */
  TIKTOK_CLIENT_KEY?: string
  TIKTOK_CLIENT_SECRET?: string
  TIKTOK_REFRESH_TOKEN?: string
}

export interface PlatformStats {
  platform: 'Instagram' | 'YouTube' | 'TikTok'
  /** Followers or subscribers. */
  followers: number | null
  /** Total likes (TikTok), total views (YouTube), or likes on the last 25 posts (Instagram). */
  engagement: number | null
  engagementLabel: string
  posts: number | null
  error?: string
}

const SNAPSHOT_KEY = 'social:last-snapshot'
const IG_TOKEN_KEY = 'social:instagram-token'
const IG_TOKEN_AT_KEY = 'social:instagram-token-refreshed-at'
const TT_REFRESH_KEY = 'social:tiktok-refresh-token'

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 160)}`)
  return body
}

async function youtube(env: SocialEnv): Promise<PlatformStats | null> {
  if (!env.YOUTUBE_API_KEY) return null
  const handle = env.YOUTUBE_HANDLE ?? '@deadworkstudio'
  try {
    const body = await getJson(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`)
    const s = body.items?.[0]?.statistics
    if (!s) throw new Error('channel not found')
    return {
      platform: 'YouTube',
      followers: s.hiddenSubscriberCount ? null : Number(s.subscriberCount),
      engagement: Number(s.viewCount),
      engagementLabel: 'total views',
      posts: Number(s.videoCount)
    }
  } catch (err) {
    return { platform: 'YouTube', followers: null, engagement: null, engagementLabel: 'total views', posts: null, error: String(err instanceof Error ? err.message : err) }
  }
}

async function instagram(env: SocialEnv, now: number): Promise<PlatformStats | null> {
  if (!env.INSTAGRAM_TOKEN) return null
  try {
    let token = (await env.NOTIFY_SIGNUPS.get(IG_TOKEN_KEY)) ?? env.INSTAGRAM_TOKEN
    const refreshedAt = Number(await env.NOTIFY_SIGNUPS.get(IG_TOKEN_AT_KEY)) || 0
    if (now - refreshedAt > 20 * 86400_000) {
      try {
        const r = await getJson(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`)
        if (r.access_token) {
          token = r.access_token
          await env.NOTIFY_SIGNUPS.put(IG_TOKEN_KEY, token)
          await env.NOTIFY_SIGNUPS.put(IG_TOKEN_AT_KEY, String(now))
        }
      } catch (err) {
        console.log('instagram token refresh failed', String(err))
      }
    }
    const me = await getJson(`https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${encodeURIComponent(token)}`)
    const media = await getJson(`https://graph.instagram.com/me/media?fields=like_count&limit=25&access_token=${encodeURIComponent(token)}`).catch(() => ({ data: [] }))
    const likes = (media.data ?? []).reduce((n: number, m: { like_count?: number }) => n + (m.like_count ?? 0), 0)
    return { platform: 'Instagram', followers: Number(me.followers_count), engagement: likes, engagementLabel: 'likes on last 25 posts', posts: Number(me.media_count) }
  } catch (err) {
    return { platform: 'Instagram', followers: null, engagement: null, engagementLabel: 'likes on last 25 posts', posts: null, error: String(err instanceof Error ? err.message : err) }
  }
}

async function tiktok(env: SocialEnv): Promise<PlatformStats | null> {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET || !env.TIKTOK_REFRESH_TOKEN) return null
  try {
    const refresh = (await env.NOTIFY_SIGNUPS.get(TT_REFRESH_KEY)) ?? env.TIKTOK_REFRESH_TOKEN
    const tok = await getJson('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: refresh }).toString()
    })
    if (!tok.access_token) throw new Error('no access token')
    if (tok.refresh_token && tok.refresh_token !== refresh) await env.NOTIFY_SIGNUPS.put(TT_REFRESH_KEY, tok.refresh_token)
    const info = await getJson('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count', {
      headers: { Authorization: `Bearer ${tok.access_token}` }
    })
    const u = info.data?.user ?? {}
    return { platform: 'TikTok', followers: Number(u.follower_count), engagement: Number(u.likes_count), engagementLabel: 'total likes', posts: Number(u.video_count) }
  } catch (err) {
    return { platform: 'TikTok', followers: null, engagement: null, engagementLabel: 'total likes', posts: null, error: String(err instanceof Error ? err.message : err) }
  }
}

type Snapshot = Record<string, { followers: number | null; engagement: number | null }>

/** Pure: lines for the email, with change since the previous snapshot. */
export function socialLines(stats: PlatformStats[], prev: Snapshot | null): string[] {
  const n = (v: number) => v.toLocaleString('en-US')
  const delta = (cur: number | null, old: number | null | undefined) => {
    if (cur === null || old === null || old === undefined) return ''
    const d = cur - old
    return d === 0 ? ' (no change)' : ` (${d > 0 ? '+' : ''}${n(d)} since yesterday)`
  }
  return stats.map((s) => {
    if (s.error || s.followers === null && s.engagement === null) return `${s.platform}: couldn't read today`
    const p = prev?.[s.platform]
    const parts: string[] = []
    if (s.followers !== null) parts.push(`${n(s.followers)} ${s.platform === 'YouTube' ? 'subscribers' : 'followers'}${delta(s.followers, p?.followers)}`)
    if (s.engagement !== null) parts.push(`${n(s.engagement)} ${s.engagementLabel}${delta(s.engagement, p?.engagement)}`)
    return `${s.platform}: ${parts.join(', ')}`
  })
}

/** Reads every configured platform, returns email lines, and saves today's numbers for tomorrow.
 *  Returns [] when no platform is set up yet. */
export async function socialSection(env: SocialEnv, now: number = Date.now()): Promise<string[]> {
  const stats = (await Promise.all([instagram(env, now), youtube(env), tiktok(env)])).filter((s): s is PlatformStats => s !== null)
  if (!stats.length) return []
  for (const s of stats) if (s.error) console.log(`social ${s.platform} failed`, s.error)
  const prevRaw = await env.NOTIFY_SIGNUPS.get(SNAPSHOT_KEY)
  const prev = prevRaw ? (JSON.parse(prevRaw) as Snapshot) : null
  const lines = socialLines(stats, prev)
  const next: Snapshot = { ...(prev ?? {}) }
  for (const s of stats) if (!s.error) next[s.platform] = { followers: s.followers, engagement: s.engagement }
  await env.NOTIFY_SIGNUPS.put(SNAPSHOT_KEY, JSON.stringify(next))
  return lines
}
