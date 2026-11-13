# Idea: free / local models in JSM HQ

Status: **parked** (2026-11-12). We stopped partway through talking it over. Pick it up here.

## The idea

Right now HQ agents can only run Claude Code or Codex. Add the option to run agents on **free models**:

- local models through **Ollama** (or any LLM downloaded locally, such as Kimi)
- free models on **OpenRouter**

**Why:** a team of agents uses a lot of tokens. Free or local models would cut that cost.

## What's decided

- Nothing yet beyond the goal above.

## Open question we stopped on

> Picturing the askwell team on this, which agents would you trust on a free local model, and which would you keep on Claude?

My guess (not agreed): keep the **lead** on Claude. It plans the work and reads PRs, and that's where a weak model hurts most. Put **workers** on small, well-defined tasks on free models.

## Still to talk through

- What "good enough" means. Local models are much weaker at long, multi-step coding than Claude. What would make this a failure even if it technically runs?
- Does each agent choose its model, or is there one setting for the whole team?
- Local only, OpenRouter only, or both from day one?
- Contribute it back to `jsmastery-pro/jsm-hq`, or keep it in your fork?

## Facts gathered so far

- **Your machine:** M1 Pro, **16 GB RAM**, Ollama already installed. 16 GB limits you to small models (roughly 7–14B), which struggle with agentic coding. This is the biggest practical constraint.
- **Source code:** public, MIT, at `github.com/jsmastery-pro/jsm-hq`. You have read access, so you'd work in a fork.
- **Dev setup:** `npm run dev:hq` runs the server and UI with live reload. `npm link` in the fork points the global `jsm-hq` command at your build, and `npm unlink -g` goes back to the published one.
- **Sandboxes:** agents run in Docker Sandboxes with a network allowlist. A local model on your Mac would be reached at `host.docker.internal:11434` (Ollama's default port), and that would need a policy rule.

## Possible approaches (unverified, check before planning)

1. **Keep the existing agent tool, swap the model behind it.** Point Claude Code or Codex at a local or OpenRouter endpoint. Ollama and Codex both have some support for this. It's the smallest change to HQ if it works well.
2. **Add a new agent tool** built for open models (e.g. OpenCode or Aider) as a third option next to Claude Code and Codex. More work in HQ, but these tools are built for model choice.
3. **Mixed team:** a per-agent model setting, so the lead stays on Claude and workers use free models.

## Next step

Answer the open question above, then finish the design before writing any code.
