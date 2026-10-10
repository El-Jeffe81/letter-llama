# Letter Llama — agent handoff

Owner: Jeff · GitHub `El-Jeffe81`
Repo: https://github.com/El-Jeffe81/letter-llama (private)

## Status

Decisions 1–9 approved 2026-10-10 ("G2g approval all"). Phase 1 CLI is in `phase1/`. Do not start Tauri or a second provider.

Test mailbox: `jjgumballs@gmail.com`. Approved as the disposable fixture account. Not connected. No OAuth client yet. Do not call Gmail until `LETTER_LLAMA_CLIENT_ID` is set.

## What is decided

- Brand name: **Letter Llama**
- Icon: a blue llama carrying letter satchels
- Local-first desktop mail. Provider is the source of truth. No hosted mailbox. No full local copy
- Gmail first. Other providers later, one at a time
- Trash and permanent delete stay different operations
- Stack later: Tauri 2 + Rust + React. Phase 1 is a Rust CLI
- Connect with `gmail.modify`. `https://mail.google.com/` only for permanent delete
- Poll history. No Pub/Sub in v1
- Optional metadata index only. No bodies. No attachment contents
- Personal / Testing-mode until Jeff asks for public verification
- No OS keychain means refuse to store the token

## What is not decided

The open blocker is a Google Cloud Desktop OAuth client id. See docs/phase-1.md.
