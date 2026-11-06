# Stock Shredder speed test — Nov 5–6, 2026

**Machine:** MacBook Pro, Apple M3 Pro, 18 GB RAM, macOS 27.0.1, on power. Other apps closed (Claude only).
**Engine:** Stock Shredder 0.6.21 release code (same import, moment-finding and export queue as the app), 2 exports at a time (the app's setting on this Mac).
**Footage:** 588 different Sony FX6/FX3/A7 III B-roll clips (S-Log3), each 20 s to 4 min, 528.6 min total. No timelapses, no interviews, and no file used twice (copies on the second drive removed). Read from the Samsung T5 EVO USB drive.
**Settings:** finished clips 5–30 s, Sony S-Log3 default look, export Graded only, ProRes 422 HQ, 4K UHD (3840x2160), written back to the same T5. Every exported file was opened and checked (playable, 3840x2160) and then removed to keep space.
**Run:** started 02:39 UTC Nov 6, finished 05:32 UTC.

## Results

| Finished clips | Clips in (sources) | Moments found | Shredded in (import + find moments) | Export time | Total |
|---|---|---|---|---|---|
| 100 | 39 | — | 8.5 min | 8.5 min | **17 min** |
| 500 | 190 | — | 31.0 min | 41.1 min | **1 h 12 min** |
| 1,000 | 588 | 1,479 | 87.9 min | 82.4 min | **2 h 50 min** |

- 1,000 row: 1,000 exports attempted, **976 finished and verified 4K**, 24 failed (see below). All 588 sources were imported once and produced 1,479 usable moments; the first 1,000 were exported. At the measured pace the 24 missing clips add about 2 min, so 1,000 good clips ≈ **2 h 52 min — under 4 hours.**
- 100 and 500 rows are taken from the same run: the time to import the sources those clips came from (per-batch scan log) plus the time until that many clips were exported (per-clip export log).
- Average export: 4.9 s per 10.1 s clip (2 running side by side), ~1.04 GB per ProRes HQ clip, 1.01 TB written in total.

## Failures (24 of 1,000, 2.4%)

All 24 said "Stock Shredder can't save to this folder right now." That message is the app's wording for an ENOENT error while the export folder still exists: the finished `.partial.mov` file was missing when the app went to rename it to its final name. First failure came after ~460 good clips. The drive stayed connected and had 497+ GB free throughout. Likely causes to check: the leftover-`.partial` cleanup racing with the second export running alongside it, or the test removing finished files as it went. Worth a follow-up fix before a customer hits it on a big batch.

Raw logs: T5 `STOCK_SHREDDER_TESTS/sony-1000-2026-11-05/` (run.log, state.json, source-files.txt, machine-and-start.txt).
