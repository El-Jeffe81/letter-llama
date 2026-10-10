# Letter Llama — agent handoff

Owner: Jeff · GitHub `El-Jeffe81`
Repo: https://github.com/El-Jeffe81/letter-llama (private)

## Status

Decisions 1–9 approved 2026-10-10 (“G2g approval all”). Phase 1 CLI is in `phase1/`. Do not start Tauri or a second provider.

The practice desk is finished: write, piles, rules, trash, and two-step permanent delete. No Gmail calls. A native desktop window cannot be built in this environment. The only remaining human step is one sign-in on Jeff's computer.

## What is decided

- Brand name: **Letter Llama**
- Icon: a blue llama carrying letter satchels (cream bags, brass buckles, navy ground)
- Product: a local-first desktop email organizer for Windows, macOS, and Linux
- Providers stay the source of truth. No hosted mailbox. No full local copy
- Gmail is the first connector. Microsoft, Yahoo, AOL, and Proton Bridge come later, one at a time
- Trash and permanent delete are different provider operations. Never substitute one for the other
- Custom collections are local metadata. They do not create provider labels
- Stack: Tauri 2 + Rust core + React UI, later. Phase 1 is a Rust CLI, not the shell
- Connect with `gmail.modify`. Full mail scope only for permanent delete
- Poll `history.list`. No Pub/Sub in v1
- Index is optional metadata. No bodies, no attachment contents
- Personal / Testing-mode only until Jeff asks for public verification
- No OS keychain means refuse to store the token

## What is not decided

Nothing from the Phase 0 list. The open blocker is a Desktop OAuth client id created under the Google account that should own Letter Llama. `jjgumballs@gmail.com` is not that owner.

## Visual system

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#07111F` | Background |
| Paper | `#F4EFE4` | Text and light surfaces |
| Cobalt | `#2F7DE1` | Primary |
| Brass | `#C6A15A` | Small accent only |

- Wordmark: Fraunces
- UI: Outfit
- Voice: short, calm, postal. Not joke-spam, not generic SaaS.

## For the next agent

1. Read `docs/phase-0/README.md` before writing features or code.
2. Keep the llama and this palette unless the owner changes the brand.
3. Do not add a hosted backend, a full mailbox mirror, or a new provider.
4. Update this file when a decision is approved.
