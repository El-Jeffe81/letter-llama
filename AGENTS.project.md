# Letter Llama

Decisions in `docs/phase-0/README.md` section 15 were approved 2026-10-10. Phase 1 is the Rust CLI in `phase1/`. Do not build the Tauri shell or a web inbox in this workspace.

## Locked

- Name: **Letter Llama**
- Mark: cobalt-blue llama with cream letter satchels and brass buckles, on navy. Raster: `src/assets/letter-llama.jpg`.
- Palette: ink `#07111F`, paper `#F4EFE4`, cobalt `#2F7DE1`, brass `#C6A15A`.
- Type: Fraunces (wordmark), Outfit (UI).
- Product: local-first desktop mail for Windows, macOS, and Linux. Provider is the source of truth.
- Repo (private): https://github.com/El-Jeffe81/letter-llama
- The preview is the practice desk. Letters there are samples written for the app. They are not Gmail. Do not call Gmail from the preview.
- Test mailbox, not owner: `jjgumballs@gmail.com`. Do not put the Google Cloud project or OAuth app under that address. No live Gmail calls without `LETTER_LLAMA_CLIENT_ID`.

## Web app in this workspace

- Auth stays **off**. Database stays **off**. No migrations, no `@/lib/db`.
- Do not present practice letters as the owner's mailbox.
- Do not call Gmail from the preview.

## Phase 1 rules

- Trash calls `messages.trash`. Permanent delete calls `messages.delete` and only with `https://mail.google.com/`.
- Never substitute one for the other.
- SQLite stores ids and headers only. No bodies, no tokens.
- Tokens go to the OS keychain or the command fails.