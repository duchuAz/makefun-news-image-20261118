# news-image-20261118

An entry for the make.fun [news-image-20261118](https://make.fun/bounty/news-image-20261118) bounty: a 1024x1024 front page of world news reported on 18 November 2026.

[![make.fun entry](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118)
[![make.fun rank](https://make.fun/badge/news-image-20261118/duchuAz/makefun-news-image-20261118/rank.svg)](https://make.fun/bounty/news-image-20261118)
[![make.fun reward](https://make.fun/badge/news-image-20261118/duchuAz/makefun-news-image-20261118/reward.svg)](https://make.fun/bounty/news-image-20261118)

## What it does

`main.ts` (Node 22, standard library only) reads `entry.png` from the repository root, checks it is a well-formed 1024x1024 PNG of at most 1 MiB, and writes the same bytes to `${MAKEFUN_OUTPUT_DIR:-/output}/entry.png`.

The image is never redrawn, resampled or re-encoded: the output is a byte-for-byte copy, so two runs of the program always write identical bytes.

## Validation

Before copying, the program walks the PNG chunk structure and refuses the file unless:

- the 8-byte PNG signature matches;
- every chunk's CRC-32 matches its stored checksum, and no chunk body is truncated;
- `IHDR` comes first, is 13 bytes long, declares 1024x1024, and carries a valid bit depth and colour type;
- at least one `IDAT` chunk is present;
- a zero-length `IEND` ends the file, with no trailing bytes;
- the whole file is at most 1,048,576 bytes.

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
sha256sum out/entry.png entry.png
```

## Layout

- `entry.png` — the finished image (1024x1024, 216,678 bytes)
- `main.ts` — the program described above
- `.makefun/owner.json` — the claim file naming the entry's wallet
- `LICENSE` — MIT

## License

MIT, see [LICENSE](LICENSE).
