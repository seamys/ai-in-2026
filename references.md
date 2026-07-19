# References — AI in 2026

Every fact, statistic, quote, or image used in the slides must trace back to an
entry here. Cite on the slide with `<p class="citation">Source: …</p>` and keep
that label consistent with the entry below.

## Format

```
### [Short label used on the slide]
- Claim: the specific fact/number/quote used
- Source: publisher / author
- Date: publication date
- URL: https://…
- Accessed: YYYY-MM-DD
- Notes: (optional) caveats, e.g. "company self-reported figure"
```

## Personal experiences (not external sources)

The two stories in Part 1 are the author's own first-hand experiences, not
third-party claims. They are listed here only for traceability and to keep them
visibly distinct from sourced facts.

### GoPro microSD recovery via Claude Code
- What happened: ~200 GB of GoPro footage on a microSD card became unreadable
  after an unsafe eject; every free tool and several expensive "pro" recovery
  apps failed or returned partial / corrupted output (no audio, mid-stream
  glitches). Claude Code hex-dumped the raw block device, then chained Linux
  CLI forensic tools and recovered every clip intact.
- When: 2026-05 (May Day trip)
- Tool: Claude Code (Anthropic), on the raw block device

### USB hub power-supply diagnosis via opencode
- What happened: in a dual-host + USB-switch + USB-hub desk setup, the speaker
  and microphone intermittently went silent while all other USB devices worked.
  opencode wrote PowerShell to enumerate and check every USB device, concluded
  in ~60 s that the hardware was healthy and the likely cause was insufficient
  USB power, and suggested plugging audio into the motherboard to verify. The
  hub's unused DC power jack turned out to be the fix.
- When: 2026-07 (a few weeks before the talk)
- Tool: opencode (local agent)

## Entries

### Example entry — replace with real sources
- Claim: "xx% of code at company Y is now AI-generated"
- Source: Company Y engineering blog
- Date: 2026-01-01
- URL: https://example.com/post
- Accessed: 2026-07-19
- Notes: self-reported; definition of "AI-generated" unclear
