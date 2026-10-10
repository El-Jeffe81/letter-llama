# Phase 0 — search, deletion, risks, proof

## Search

1. Default path is live provider search. The UI says the search is live, still running, incomplete, or limited by the provider.
2. A user may index a folder, a date range, or the result of a search. Metadata first. Body text is a second switch, default off.
3. Attachment contents are not indexed.
4. Before Trash or permanent delete, the core re-fetches the ids. Missing ids are dropped and reported. Stale index hits cannot delete a different message.
5. There is no mandatory offline body cache.

## Destructive actions

Before a bulk Trash or permanent delete:

1. Show account, operation name, and count.
2. Permanent delete uses a second confirmation that is visually distinct from Trash. On Gmail the copy says it cannot be undone. On Microsoft the copy must not say instant and unrecoverable.
3. Revalidate ids.
4. Send batches. Default cap assumption: 50 messages per batch, with progress.
5. Store a per-id success or failure. A partial failure is not a success.
6. Mark local refs missing only after the provider confirms.
7. If the scope does not allow the operation, stop and explain. Do not substitute the other operation.

`messages.batchDelete` is also permanent and also requires `https://mail.google.com/`. Do not call it with a Trash-shaped confirmation.

## Threat model

| Risk | What we do |
| --- | --- |
| Stolen refresh token | OS keychain only. The UI and logs never see it |
| Malicious HTML mail | Sanitize before the webview. No scripts. Remote images off until allowed for that message |
| Bulk delete of the wrong ids | Revalidate, batch, per-id results, distinct confirmations |
| OAuth redirect theft | System browser, PKCE, state, loopback on 127.0.0.1 |
| Secret in a desktop binary | Public OAuth client. No pretended confidential secret |
| Mail in a backup of the SQLite file | Subjects and opted-in body text sit on disk. SQLCipher is open, not in v1 |
| Sync cursor gap | 404 forces a rescan. Destructive actions do not trust the cursor alone |
| Provider hold or retention | Surface the provider's result. Do not claim a deletion the provider did not confirm |

No telemetry in v1.

## Dependencies to pin at the start of Phase 1

Not added in Phase 0. Tauri 2, Rust stable, React + TypeScript, `reqwest` with rustls, an OAuth PKCE library, `keyring`, `rusqlite` with bundled SQLite FTS5, `ammonia`, a Rust MIME parser, `tokio`, `tracing` with redaction.

Rejected for v1: Electron as the default, Nylas, a Gmail Pub/Sub client, attachment search, any mail library inside the UI.

## Phase 1 proof

Not started. A Rust CLI, one sacrificial Gmail account, fixtures created by the test itself:

1. Loopback OAuth with `gmail.modify`.
2. `messages.list` for a page of ids. Do not download the mailbox.
3. Live search with a unique subject the fixture just sent.
4. `messages.get` one message. Do not write the body to SQLite.
5. Flip read state and read it back from Gmail.
6. Send one message to the same test account.
7. Trash one fixture. Confirm the Trash label with a fresh get.
8. Only if a second login granted `https://mail.google.com/`, `messages.delete` a different fixture and confirm a later get is 404. If the scope is absent, record the 403 and stop.
9. Write SQLite rows for the search hits. Search that table. Delete the table. Confirm Gmail still has the messages.
10. Trash one fixture on the Gmail website. Next history sync marks the local ref missing.

Do not use a personal archive. Do not build the three-pane UI in this phase.

## Test gates for that proof

List without a local body table. Search hits via `q`, not SQLite. Body not left on disk. Read state matches the Gmail `UNREAD` label. Send arrives from the test account. Trash is proven by the provider label. Permanent delete is a 404 or a recorded 403. A stale id is skipped and its neighbors are unchanged. Clearing the index does not change Gmail. Restart keeps the keychain token and does not put it in the database. Logs contain no Authorization value and no MIME body.
