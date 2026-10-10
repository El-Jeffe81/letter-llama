# Letter Llama — agent handoff

Owner: Jeff · GitHub `El-Jeffe81`
Repo: https://github.com/El-Jeffe81/letter-llama (private)

## Status

Phase 0 is written. Coding has not started. Do not start Phase 1 until Jeff approves the decisions in [phase-0/README.md](phase-0/README.md) section 15.

## What is decided

- Brand name: **Letter Llama**
- Icon: a blue llama carrying letter satchels (cream bags, brass buckles, navy ground)
- Product: a local-first desktop email organizer for Windows, macOS, and Linux
- Providers stay the source of truth. No hosted mailbox. No full local copy
- Gmail is the first connector. Microsoft, Yahoo, AOL, and Proton Bridge come later, one at a time
- Trash and permanent delete are different provider operations. Never substitute one for the other
- Custom collections are local metadata. They do not create provider labels
- Phase 0 recommendation, **not yet approved:** Tauri 2 + Rust core + React UI. Phase 1 is a Rust CLI proof, not the full shell

## What is not decided

The nine approvals in `docs/phase-0/README.md` section 15. Do not guess them.

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
