// deadwork-hq/test-social-logic.mjs: socialLines() wording and "since yesterday" math.
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failed++ }
const out = path.join(mkdtempSync(path.join(tmpdir(), 'hq-social-')), 's.mjs')
await build({ entryPoints: [path.join(ROOT, 'src/socialStats.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const { socialLines } = await import(pathToFileURL(out).href)
const ig = { platform: 'Instagram', followers: 1204, engagement: 380, engagementLabel: 'likes on last 25 posts', posts: 90 }
const yt = { platform: 'YouTube', followers: 310, engagement: 45210, engagementLabel: 'total views', posts: 12 }
const tt = { platform: 'TikTok', followers: null, engagement: null, engagementLabel: 'total likes', posts: null, error: '401' }
const first = socialLines([ig, yt], null)
check('first day has no change numbers', first[0] === 'Instagram: 1,204 followers, 380 likes on last 25 posts', first[0])
check('YouTube says subscribers', first[1] === 'YouTube: 310 subscribers, 45,210 total views', first[1])
const next = socialLines([ig, yt, tt], { Instagram: { followers: 1192, engagement: 380 }, YouTube: { followers: 315, engagement: 45000 } })
check('growth shows +', next[0].includes('1,204 followers (+12 since yesterday)'), next[0])
check('no change says so', next[0].includes('380 likes on last 25 posts (no change)'), next[0])
check('a drop shows -', next[1].includes('310 subscribers (-5 since yesterday)'), next[1])
check('a failed platform says it plainly', next[2] === "TikTok: couldn't read today", next[2])
if (failed) process.exit(1)
