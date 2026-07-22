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

### Frontier releases

### [GPT-5 launch]
- Claim: OpenAI released GPT-5 in August 2025, unifying chat and reasoning models
- Source: OpenAI, "Introducing GPT-5"
- Date: 2025-08-07
- URL: https://openai.com/index/introducing-gpt-5/
- Accessed: 2026-07-22

### [GPT-5.1 launch]
- Claim: GPT-5.1 released 2025-11-12 (Instant & Thinking modes)
- Source: OpenAI
- Date: 2025-11-12
- URL: https://openai.com/index/gpt-5-1/
- Accessed: 2026-07-22

### [Gemini 3 Pro launch]
- Claim: Google released Gemini 3 Pro on 2025-11-18 (1M-token context, deep-think mode)
- Source: Google, "Introducing Gemini 3"
- Date: 2025-11-18
- URL: https://blog.google/products/gemini/gemini-3/
- Accessed: 2026-07-22

### [Claude Opus 4.5 launch]
- Claim: Anthropic released Claude Opus 4.5 on 2025-11-24 (SWE-bench Verified 80.9%, ~2/3 price cut vs Opus 4.1)
- Source: Anthropic
- Date: 2025-11-24
- URL: https://www.anthropic.com/news/claude-opus-4-5
- Accessed: 2026-07-22

### [GPT-5.2 and the "code red"]
- Claim: OpenAI released GPT-5.2 in December 2025 (per third-party trackers: Dec 10), after internally declaring "code red" over Gemini 3
- Source: Magica/Galaxy AI model comparison (release date); Sina Tech repost (code-red reporting)
- Date: 2025-12-10
- URL: https://blog.galaxy.ai/compare/gpt-5-2-vs-gpt-5-3-codex ; https://t.cj.sina.cn/articles/view/6890756658/19ab89a3204001gjgg
- Accessed: 2026-07-22
- Notes: "code red" wording originates from press reports (The Information, paywalled); treat as reported, not official

### [2026 release cadence]
- Claim: in H1 2026 frontier releases became near-monthly — Claude Opus 4.6 (Feb), GPT-5.3-Codex (Feb), GPT-5.4 (Mar), Claude Opus 4.7 (Apr 16), GPT-5.5 / DeepSeek V4 (Apr), Claude Opus 4.8 (May 28), Claude Fable 5 (Jun 9), GPT-5.6 (mid-2026)
- Source: PromptZone AI model release tracker (verified 2026-07-16); Web Reactiva release analyses; Tosea AI Opus 4.8 guide
- Date: 2026-07-16
- URL: https://www.promptzone.com/ai-model-releases ; https://www.webreactiva.com/blog/claude-opus-4.7 ; https://tosea.ai/blog/claude-opus-4-8-complete-guide
- Accessed: 2026-07-22
- Notes: aggregated from third-party trackers; cross-check any single date against the vendor blog before quoting publicly

### [Claude Fable 5 launch]
- Claim: Anthropic released Claude Fable 5 on 2026-06-09 — the first "Mythos-class" model, a tier above Opus 4.8; priced $10 / $50 per million input/output tokens
- Source: Codersera launch guide; ccleaks news (both citing the Anthropic press release)
- Date: 2026-07-10
- URL: https://codersera.com/blog/claude-fable-5-launch-guide-2026/ ; https://ccleaks.com/news/claude-fable-5-mythos-5-new-tier
- Accessed: 2026-07-22

### Open weights

### [DeepSeek V3.2-Exp]
- Claim: DeepSeek released V3.2-Exp on 2025-09-29 with sparse attention (DSA), halving API prices
- Source: DeepSeek (via PromptZone tracker)
- Date: 2025-09-29
- URL: https://www.promptzone.com/ai-model-releases
- Accessed: 2026-07-22

### [DeepSeek V4]
- Claim: DeepSeek released V4 Preview (V4-Pro + V4-Flash) on 2026-04-24 — open weights, 1M-token context, immediate API access
- Source: Framia announcement summary; Codersera V4 guide
- Date: 2026-04-24
- URL: https://framia.converge.ai/page/en-US/news/deepseek-v4-announcement-april-2026 ; https://codersera.com/blog/deepseek-v4-release-date-features-benchmarks/
- Accessed: 2026-07-22

### [Qwen3.5 / Qwen3.7 / Qwen3.8]
- Claim: Alibaba released Qwen3.5 (2026-02-16, native multimodal, 397B-A17B flagship), Qwen3.7 (2026-05-20, Aliyun Summit), and opened Qwen3.8-Max-Preview on 2026-07-19 (2.4T params; full release and open-source drop announced as imminent)
- Source: CSDN/DevPress coverage citing the Qwen technical report; Sina Tech; Aliyun developer community
- Date: 2026-07-20
- URL: https://blog.csdn.net/xyghehehehe/article/details/159671079 ; https://finance.sina.com.cn/tech/roll/2026-07-20/doc-iniinmvy8279305.shtml ; https://developer.aliyun.com/article/1749290
- Accessed: 2026-07-22
- Notes: Qwen3.5/3.7 coverage is mostly secondary Chinese tech blogs; Qwen3.8 is preview-stage — final specs may change

### [GLM-5 line]
- Claim: Zhipu (Z.ai) released GLM-5 (2026-02-11, 744B/40B MoE), GLM-5.1 (2026-04-07), GLM-5.2 (2026-06-16, 753B, MIT license); vendor claims GLM-5.2 beats GPT-5.5 on long-horizon coding at ~1/6 the cost
- Source: DataLearner model page; OpsMatters & URankMyAI GLM-5.2 reviews
- Date: 2026-06-16
- URL: https://www.datalearner.com/ai-models/pretrained-models/glm-5 ; https://opsmatters.com/posts/glm-52-review-2026-zhipu-ais-open-weight-coding-model-honestly-assessed
- Accessed: 2026-07-22
- Notes: benchmark comparisons are vendor-reported (flagged as such in the reviews); a GLM-5.5 is rumored for August 2026 (felloai.com/glm-5-5, community speculation) — not officially announced as of 2026-07-22

### [Kimi K2 Thinking]
- Claim: Moonshot AI open-sourced Kimi K2 Thinking (Nov 2025), a 1T-parameter MoE model designed for agentic, long-horizon reasoning
- Source: Moonshot AI (Kimi K2 project repo)
- Date: 2025-11
- URL: https://github.com/MoonshotAI/Kimi-K2
- Accessed: 2026-07-22

### [Kimi K3]
- Claim: Moonshot AI unveiled Kimi K3 at WAIC on 2026-07-16/17: 2.8T-parameter MoE, KDA hybrid linear attention, 1M-token context, native vision; full open weights on 2026-07-27; largest open-weights model to date
- Source: Xinhua; ABMedia K3 guide
- Date: 2026-07-17
- URL: http://www.xinhuanet.com/tech/20260717/da893d3a5e1b429ea79d928e02847744/c.html ; https://abmedia.io/kimi-k3-complete-guide-2026
- Accessed: 2026-07-22
- Notes: "beats Fable 5 / GPT-5.6 on Code Arena" is from secondary blogs, not verified on the official leaderboard

### [DeepSeek V3.2 / V3.2-Speciale]
- Claim: DeepSeek released V3.2 and V3.2-Speciale on 2025-12-01; Speciale reached gold-medal level at IMO 2025, IOI 2025 and ICPC World Finals 2025, reported ahead of GPT-5 High on those contests
- Source: DeepSeek official announcement; contest results via cnblogs write-up
- Date: 2025-12-01
- URL: https://api-docs.deepseek.com/zh-cn/news/news251201/ ; https://www.cnblogs.com/xtkyxnx/p/19571916
- Accessed: 2026-07-22
- Notes: contest results are vendor-reported

### Agents

### [Meta acquires Manus]
- Claim: Meta acquired general-agent startup Manus (Butterfly Effect) in a multi-billion-dollar deal announced 2025-12-30; founder Xiao Hong became a Meta VP
- Source: Tencent News
- Date: 2025-12-30
- URL: https://news.qq.com/rain/a/20251230A01HRY00
- Accessed: 2026-07-22
- Notes: reported as Meta's third-largest acquisition; exact price not officially disclosed

### [Claude Skills / Claude Code adoption]
- Claim: Anthropic commercialized Claude Skills (Oct 2025); Claude Code became mainstream developer tooling
- Source: Anthropic
- Date: 2025-10
- URL: https://www.anthropic.com/news/skills
- Accessed: 2026-07-22

### [OpenClaw surge]
- Claim: open-source agent framework OpenClaw reached GitHub's global top 10 in ~10 days (Jan 2026)
- Source: AI Skill Navigation industry timeline
- Date: 2026-01
- URL: https://aiskillnav.com/news
- Accessed: 2026-07-22
- Notes: single third-party source; treat as approximate

### Regulation

### [Fable 5 export control and restoration]
- Claim: on 2026-06-12 the US Commerce Dept issued an export-control order covering Claude Fable 5 and Mythos 5 — no foreign access, incl. foreign citizens inside the US and Anthropic's own foreign staff; Anthropic suspended all access worldwide for ~3 weeks (first recall of a deployed frontier model); controls lifted 2026-07-01
- Source: Huxiu analysis; Yicai via MOFCOM export-control portal; NetEase (Axios reporting)
- Date: 2026-06-15 / 2026-07-01
- URL: https://www.huxiu.com/article/4867489.html ; https://exportcontrol.mofcom.gov.cn/article/gjdt/202607/1304.html ; https://www.163.com/tech/article/L0O813E300097U7T.html
- Accessed: 2026-07-22
- Notes: the reported trigger — a red-team test by an Amazon research team — comes from press coverage, not an official statement

### [GPT-5.6 gated launch]
- Claim: OpenAI previewed GPT-5.6 (Sol/Terra/Luna tiers) on 2026-06-26 to limited partners after the US government required a cybersecurity review (Commerce Dept / CAISI); general availability ~2026-07-09; OpenAI publicly objected to the process
- Source: o-mega.ai benchmark/pricing breakdown (citing TechCrunch and Engadget); Codersera GPT-5.6 guide
- Date: 2026-07-08
- URL: https://o-mega.ai/articles/openai-gpt-5-6-full-benchmark-pricing-july-2026 ; https://codersera.com/blog/gpt-5-6-release-date-whats-new-2026/
- Accessed: 2026-07-22

### Industry & capital

### [OpenAI mega-round]
- Claim: OpenAI announced $110B at a $730B pre-money valuation on 2026-02-27 and closed $122B at $852B post-money on 2026-03-31
- Source: kingy.ai funding tracker (aggregating company announcements)
- Date: 2026-03-31
- URL: https://kingy.ai/ai/openai-vs-anthropic-mindshare-through-may-15-2026/
- Accessed: 2026-07-22

### [Anthropic funding and IPO filing]
- Claim: Anthropic raised $13B Series F at $183B (Sep 2025), $30B Series G at $380B (Feb 2026), ~$65B at ~$965B (May 2026); filed for IPO in June 2026
- Source: kingy.ai; Launch Consulting; OSAS AI Solutions
- Date: 2026-06
- URL: https://kingy.ai/ai/openai-vs-anthropic-mindshare-through-may-15-2026/ ; https://www.launchconsulting.com/posts/ai-news-from-may-2026 ; https://osasai.com/blog/ai-news-first-week-june-2026
- Accessed: 2026-07-22
- Notes: May 2026 round and IPO filing from secondary reporting, not official filings

### [Labs designing their own chips]
- Claim: OpenAI (with Broadcom, chip codenamed Jalapeño) and Anthropic (early talks with Samsung) moved to design custom AI chips
- Source: Crypto Briefing
- Date: 2026-07-14
- URL: https://cryptobriefing.com/openai-anthropic-to-develop-custom-ai-chips-eyeing-12t-valuation-by-2026/
- Accessed: 2026-07-22

### [AI as #1 layoff reason]
- Claim: AI was the top cited reason for US company job cuts in April 2026 (second consecutive month); IT sector shed 13,000 jobs
- Source: AIToolsRecap, citing Challenger, Gray & Christmas and US DoL data
- Date: 2026-05-11
- URL: https://aitoolsrecap.com/Blog/ai-news-may-11-2026
- Accessed: 2026-07-22

### [Labs enter enterprise delivery]
- Claim: on 2026-05-04 OpenAI ("The Deployment Company", ~$10B with TPG) and Anthropic (with Blackstone/H&F/Goldman, ~$1.5B) each announced PE-backed enterprise AI services ventures
- Source: nerdleveltech
- Date: 2026-05-04
- URL: https://nerdleveltech.com/openai-anthropic-private-equity-consulting-ventures
- Accessed: 2026-07-22

### [Zhipu HK listing / Moonshot IPO plans]
- Claim: Zhipu (Z.ai) listed on HKEX on 2026-01-08 — first publicly traded Chinese foundation-model lab (~$44B market cap); Moonshot AI reportedly preparing a Hong Kong IPO
- Source: Sina Finance (IPO-day internal letter); Remote OpenClaw GLM overview; anyanygame WAIC coverage
- Date: 2026-01-08 / 2026-07-19
- URL: https://finance.sina.com.cn/roll/2026-01-08/doc-inhfqikx1458505.shtml ; https://www.remoteopenclaw.com/blog/best-glm-models-2026 ; https://www.anyanygame.com/post/529
- Accessed: 2026-07-22
- Notes: Moonshot IPO is "reportedly preparing" — no official filing confirmed

### Training methods

### [InstructGPT / RLHF]
- Claim: RLHF pipeline — reward model trained on human preference rankings, then PPO to optimize the LLM against it
- Source: Ouyang et al., "Training language models to follow instructions with human feedback"
- Date: 2022-03-04
- URL: https://arxiv.org/abs/2203.02155
- Accessed: 2026-07-22

### [DeepSeek-R1 / RLVR]
- Claim: reasoning capabilities emerge from RL with verifiable (rule-checked) rewards; R1 reasoning was also distilled into Qwen/Llama small models
- Source: DeepSeek-AI, "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"
- Date: 2025-01-22
- URL: https://arxiv.org/abs/2501.12948
- Accessed: 2026-07-22

### [DPO]
- Claim: direct preference optimization trains on preference pairs without a reward model or online RL
- Source: Rafailov et al., "Direct Preference Optimization: Your Language Model is Secretly a Reward Model"
- Date: 2023-05-29
- URL: https://arxiv.org/abs/2305.18290
- Accessed: 2026-07-22

### [GRPO]
- Claim: group relative policy optimization estimates advantage from a group of sampled responses, removing the value model (used by DeepSeek)
- Source: Shao et al., "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models"
- Date: 2024-02-05
- URL: https://arxiv.org/abs/2402.03300
- Accessed: 2026-07-22

### [ReAct / agent loop]
- Claim: interleaving reasoning traces and actions (tool calls) grounds LLMs in external environments
- Source: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models"
- Date: 2022-10-06
- URL: https://arxiv.org/abs/2210.03629
- Accessed: 2026-07-22

### [MCP]
- Claim: Model Context Protocol standardizes how models connect to tools and data sources
- Source: Anthropic / modelcontextprotocol.io
- Date: 2024-11
- URL: https://modelcontextprotocol.io
- Accessed: 2026-07-22

### [RL environment factory]
- Claim: agentic RL trains models inside containerized task environments (Docker/microVM sandboxes) — spawn a container, let the agent work multi-turn, verify with a programmatic reward; rollouts consume 80–90% of wall-clock time; Anthropic reportedly spends tens of millions USD/year on RL environment development and OpenAI has signed seven-figure contracts with environment providers; MiniMax launches 5,000+ isolated environments within 10 seconds; Poolside indexes 800K+ repos with OCI container isolation
- Source: "Enter the Scaling of RL Environments" (guanghan.ai, literature distillation); Sapphire Ventures RL overview; LessWrong environment-quality critique
- Date: 2026-04-09
- URL: https://blog.guanghan.ai/post/260409_env_scaling/ ; https://sapphireventures.com/blog/reinforcement-learning-environments-ai-agents/ ; https://www.lesswrong.com/posts/HsLWpZ2zad43nzvWi/trust-me-bro-just-one-more-rl-scale-up-this-one-will-be-the
- Accessed: 2026-07-22
- Notes: spend/contract figures are "reportedly"-level claims from a blog synthesis, not official disclosures; see also arXiv:2601.16443 ("Endless terminals") and ByteDance's AgentGym-RL (ICLR 2026)

### [Fable 5 / Mythos 5 system card]
- Claim: 264-page system card (2026-06-09); training described only as a "proprietary mix of publicly available information from the internet, public and private datasets"; discloses accidental chain-of-thought supervision during training, grader-awareness grounded in exploitable training-environment graders, multi-agent harness evals, and deployment-time safeguards (activation probe + LLM classifier + Opus fallback; invisible PEFT/steering downgrade on ~0.03% of traffic)
- Source: Anthropic (PDF); detailed walkthrough (cvam.sight)
- Date: 2026-06-09
- URL: https://www-cdn.anthropic.com/d00db56fa754a1b115b6dd7cb2e3c342ee809620.pdf ; https://shivam2003.com/posts/claude-fable-5-mythos-5-system-card
- Accessed: 2026-07-22
- Notes: walkthrough is a third-party read-through; page-level claims should be checked against the PDF if quoted verbatim

### [Post-training compute inversion]
- Claim: Cursor disclosed that Composer 1.5's post-training compute exceeded pre-training (20× RL scale-up, Sep 2025); Anthropic attributes Opus 4.7's gains to CAI + RL post-training rather than base-model growth; DeepSeek V4 uses on-policy distillation post-training
- Source: Digital Applied, "The Post-Training Revolution: RL Is the New Moat in 2026"
- Date: 2026-05-17
- URL: https://www.digitalapplied.com/blog/post-training-revolution-rl-new-moat-2026
- Accessed: 2026-07-22
- Notes: only Cursor's figure is a vendor-disclosed number; the article flags other ratios as directional
