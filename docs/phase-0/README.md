# Letter Llama — Phase 0

Reviewed 2026-10-10 against current official docs. No mailbox was connected. Nothing here was executed against Gmail.

Labels used in the longer notes: **Verified** means an official page said it. **Assumption** is a recommended default. **Open** still needs a decision or a live test.

The live-delete exit criterion is **not met**. There is no Google Cloud OAuth client and no sacrificial test mailbox in this environment.

Companion note: [02-safety.md](02-safety.md) has search, deletion safety, the threat model, dependencies, the risk register, the 10-step proof, and the test plan.

## Recommendation

Tauri 2 shell, Rust core, React UI. Phase 1 is a Rust CLI against a sacrificial Gmail account, not the desktop shell.

```text
React UI (Tauri webview)
        │  commands only (no tokens, no raw MIME logs)
        ▼
Rust core — accounts, provider traits, sync, SQLite, HTML sanitize
        ├── OS keychain (refresh tokens)
        ├── SQLite (refs, collections, optional FTS)
        └── Gmail REST now; Graph, Yahoo, AOL, Proton Bridge later
```

Electron is the fallback only if loopback OAuth fails on an OS. A hosted mail gateway is rejected. This web preview is brand and docs only.

## Verified Gmail facts (2026-09-10 scopes, 2026-04-15 delete/trash, 2026-09-10 quota, 2026-09-15 sync)

- `gmail.modify` is restricted. It can read, send, archive, and Trash. It cannot permanently delete.
- `users.messages.delete` requires `https://mail.google.com/` and Google says it cannot be undone. Prefer Trash.
- `users.messages.trash` accepts `gmail.modify` or `https://mail.google.com/` and moves mail to Trash.
- Reading mail (`gmail.readonly`, `gmail.metadata`, `gmail.modify`) is restricted. `gmail.send` is sensitive. `gmail.labels` is non-sensitive and is not enough.
- If restricted-scope data is stored on a server or transmitted, a security assessment is required. Personal use and testing are verification exceptions. A local-only binary is not an automatic exemption from verification. Whether a shipped local app owes annual CASA is **open**.
- Quota: 1,200,000 units per project per minute, 6,000 per user per minute. `messages.get` and `messages.trash` are 20 units. `messages.list` is 5. `messages.delete` is 10. `messages.send` is 100.
- Header indexing is about 300 messages a minute at the cap. Cleanup should use live Gmail search, not a body backfill.
- History is typically kept at least a week, sometimes less. HTTP 404 on `history.list` means rescan ids, not download every body.
- **Assumption:** Testing-mode External apps expire refresh tokens in 7 days and cap users near 100. Confirm that doc before coding login.

## Other providers

- Microsoft: `DELETE` moves to Deleted Items (`Mail.ReadWrite`, docs 2025-07-23). `permanentDelete` also uses `Mail.ReadWrite` but puts mail in the Purges folder and retention or a hold can keep it (docs 2026-08-24). Do not describe that as instant Gmail-style destruction. Send needs `Mail.Send`.
- Yahoo and AOL share Yahoo's identity system but need separate OAuth client credentials and an approved mail scope. IMAP `OAUTHBEARER`. Not the first connector.
- Proton: paid Proton Mail Bridge only, localhost IMAP/SMTP, desktop only, custom clients are not officially supported. Not in the first release.

## Local data

SQLite holds accounts, message refs `(account_id, provider_message_id)`, collections, saved searches, optional FTS, and operation results. No tokens, no MIME in logs. Collection removal does not call the provider. Clearing an index does not delete provider mail. Body text and snippets default off. Attachment contents are never indexed in v1.

## Decisions needed before any coding

1. **Stack.** Approve Tauri 2 + Rust core + React UI, with Electron only if Phase 2 proves Tauri cannot complete OAuth on an OS.
2. **Permanent delete grant.** Approve the two-step model: `gmail.modify` at connect, `https://mail.google.com/` only when the user enables permanent delete.
3. **Phase 1 shape.** Approve a Rust CLI proof, not the desktop shell.
4. **Test account.** You create a Google Cloud project, a Desktop OAuth client, and a sacrificial Gmail, and you add that Gmail as a test user.
5. **Sync.** Approve polling `history.list`. No Gmail Pub/Sub and no public webhook in v1.
6. **Index default.** Approve metadata-only optional index, body text off, attachment contents never in v1.
7. **Audience.** Approve personal and Testing-mode use until you separately ask for public Google verification.
8. **Linux credentials.** Approve failing closed when Secret Service is missing, rather than inventing a password vault in v1.
9. **Brand.** Confirm this product is Letter Llama and this repo is the handoff.

## What this phase did not do

- No provider login, Trash, delete, or send.
- No Tauri project and no new runtime dependencies.
- No claim that the proof steps pass.
