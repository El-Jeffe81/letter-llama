# Letter Llama — Phase 0

Reviewed 2026-10-10 against current official docs. No mailbox was connected. Nothing here was executed against Gmail.

Labels: **Verified** means an official page said it. **Assumption** is a recommended default, not a measured fact. **Open** still needs a decision or a live test.

This phase does not build the app. The exit criterion in the brief (a live Gmail delete) is **not met**. Jeff named `jjgumballs@gmail.com` as the test mailbox on 2026-10-10. No OAuth client exists yet, and nothing has connected to that account.

## 1. Executive summary

Letter Llama is a local-first desktop client for mail that already lives at Gmail, Microsoft, Yahoo, AOL, or Proton. The provider stays the source of truth. The app stores preferences, collection membership, and optional indexes. It does not keep a second mailbox.

The first connector is Gmail. The hard fact: **Trash and permanent delete are different permissions.** `gmail.modify` can read, send, archive, and Trash. Only `https://mail.google.com/` can call `users.messages.delete`, and Google says that call cannot be undone.

Recommended build, pending approval: **Tauri 2 shell, Rust core, React UI.** Phase 1 is a Rust command-line proof against a sacrificial Gmail account, not the full desktop UI.

Public distribution is a later project. A Testing-mode Google app is enough to prove the workflow and is a bad product: refresh tokens die in 7 days, and unverified restricted scopes do not ship cleanly to the public.

## 2. Scope locked by the brief

In scope for the product, not for this phase:

- Multiple existing accounts. Gmail first.
- Read, compose, reply, forward, send, read or unread.
- Local collections and saved views that do not create provider labels.
- A cleanup workspace whose Trash and permanent-delete actions hit the provider.
- Live provider search, plus an optional selective index.

Out of scope until a later approval: hosted mailbox, full offline copy, AI deletion, auto-created provider labels, attachment-content indexing, calendar or contacts, a browser extension.

## 3. Architecture

```text
React UI (Tauri webview)
  lists, reader, composer, collections, cleanup review
        │  commands only (no tokens, no raw MIME logs)
        ▼
Rust core
  accounts · provider traits · sync · SQLite · HTML sanitize
        │
        ├── OS keychain (refresh tokens)
        ├── SQLite (refs, collections, optional FTS)
        └── Provider adapters
              Gmail REST   Microsoft Graph   IMAP/SMTP (Yahoo, AOL, Proton Bridge)
```

The UI asks for an operation by account id and provider message id. Rust re-checks those ids with the provider, then Trash or permanent-delete. The UI cannot mark a destructive operation complete.

### Why this and not the others

| Option | Fit | Why it is not the default |
| --- | --- | --- |
| Tauri 2 + Rust + React | Best fit on paper | Still an **assumption** until a packaged app does loopback OAuth on Windows, macOS, and Linux |
| Electron + Node | Acceptable fallback | Higher memory, larger attack surface, worse match for a local-first mail tool |
| Flutter or fully native | Strong OS integration | Three UI stacks, or a weak HTML-mail story |
| Hosted gateway (Nylas and similar) | Faster connectors | Breaks local-first. Mail would transit a company server. Rejected |
| This web preview | Brand and docs only | No OS keychain, no installable desktop shell, no background sync |

**Assumption:** Tauri 2 can do system-browser OAuth with PKCE and a loopback redirect, OS keychain via the `keyring` crate, and a Rust background task inside the app process. Verify that on three operating systems in Phase 2. If loopback OAuth fails on one OS, Electron is the fallback for that OS only, not a reason to add a server.

**Assumption:** a desktop OAuth client is a public client. Do not treat an embedded client secret as secret. Use PKCE. Store refresh tokens only in the OS credential store (Windows Credential Manager, macOS Keychain, Linux Secret Service).

No Pub/Sub, no always-on cloud worker, no mail content leaving the machine for an app-owned service.

## 4. Provider capability matrix

Status key: **Verified** on the date shown. **Later** means not researched past the official starting point. **Unsupported** means the provider cannot do the thing the same way.

| Capability | Gmail | Microsoft 365 / Outlook | Yahoo | AOL | Proton |
| --- | --- | --- | --- | --- | --- |
| First connector | Yes | Phase 7 | Phase 7 | Phase 7 | Phase 7 |
| Auth | OAuth, restricted scopes. Verified 2026-09-10 | Graph delegated OAuth | OAuth2 mail scope, app review. Yahoo Sender Hub, retrieved 2026-10-10 | Same identity system as Yahoo, **separate client credentials**. Verified on Yahoo's doc | Proton Mail Bridge on localhost. Official support page, retrieved 2026-10-10 |
| List and live search | `messages.list` + `q`. Verified via sync guide 2026-09-15 | Graph `$search`. **Assumption** until Phase 7 | IMAP SEARCH. **Open** | IMAP SEARCH. **Open** | IMAP via Bridge. Custom clients are not officially supported |
| Read body on demand | `messages.get`. Quota 20 units. Verified 2026-09-10 | `Mail.Read` or `Mail.ReadWrite` | IMAP FETCH | IMAP FETCH | IMAP FETCH through Bridge |
| Send | `gmail.send` (sensitive) or `gmail.modify` (restricted) | `Mail.Send`. ReadWrite does **not** include send | SMTP + OAuth | SMTP + OAuth | Bridge SMTP `127.0.0.1:1025` |
| Read / unread | Label `UNREAD` via `messages.modify` | Graph property update. **Assumption** | IMAP flags. **Open** | IMAP flags. **Open** | IMAP flags. **Open** |
| Archive | Remove `INBOX` label. Does not need a new label created by us | Move out of Inbox. **Assumption** | Provider-specific. **Open** | **Open** | **Open** |
| Trash | `messages.trash`. Scope `gmail.modify` or `mail.google.com`. Moves to Trash. Verified 2026-04-15 | `DELETE` message moves to Deleted Items. `Mail.ReadWrite`. Learn page dated 2025-07-23 | IMAP delete semantics differ by server. **Open** | **Open** | **Open** |
| Permanent delete | `messages.delete`. Scope **only** `https://mail.google.com/`. "Cannot be undone." Verified 2026-04-15 | `POST .../permanentDelete`. `Mail.ReadWrite`. Goes to the Purges folder and is removed later unless a hold exists. Verified 2026-08-24. **Not the same as Gmail** | **Open.** Do not promise it | **Open** | **Open** |
| Incremental sync | `history.list`. History "typically available for at least one week and often longer," sometimes shorter. HTTP 404 means full resync. Verified 2026-09-15 | Delta query. **Assumption** | UIDVALIDITY can invalidate UIDs. **Open** | Same | Bridge mailbox changes. **Open** |
| Push | Optional `users.watch` + Google Cloud Pub/Sub. Not required. Skip in v1 | Graph subscriptions need a public HTTPS endpoint. Skip in v1 | IDLE. **Later** | IDLE. **Later** | None beyond Bridge |

Message identity is a pair: `(account_id, provider_message_id)`. A Gmail id is never an Outlook id or an IMAP UID. IMAP also needs UIDVALIDITY stored beside the UID or the id is unsafe.

## 5. Gmail permissions

Source: [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), last updated 2026-09-10 UTC. [messages.delete](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/delete), last updated 2026-04-15 UTC. [messages.trash](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/trash), same date. [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification), retrieved 2026-10-10.

| Scope | Class | Use |
| --- | --- | --- |
| `gmail.labels` | Non-sensitive | Not sufficient for reading mail |
| `gmail.send` | Sensitive | Send only |
| `gmail.metadata` | Restricted | Headers and labels, no body. Too small for a reader |
| `gmail.readonly` | Restricted | Read. Cannot send, Trash, or delete |
| `gmail.compose` | Restricted | Drafts and send. Not the mailbox reader |
| `gmail.modify` | Restricted | Read, compose, send, labels, Trash. **Cannot** permanently delete |
| `https://mail.google.com/` | Restricted | Everything, including immediate permanent delete |

Google's own note: request `https://mail.google.com/` only if the app must permanently delete, bypassing Trash. Every other action can use a narrower scope.

**Verified:** if the app stores restricted-scope data on servers, or transmits it, a security assessment is required. A local-only app is not automatically exempt from OAuth verification. Verification exceptions called out by Google include personal use, development and testing, and internal Workspace use.

**Assumption, widely reported, not re-quoted from a Google policy page in this review:** an External app left in Testing expires refresh tokens after 7 days and is capped around 100 users. Treat that as true for planning. Confirm on the consent-screen docs before Phase 1 login is implemented.

**Open:** whether a shipped local-only binary that never uploads mail still owes an annual CASA assessment. Google ties the assessment to access "from or through a third-party server" and to storing or transmitting restricted data. Do not start that process until public distribution is an explicit goal.

### Recommended grant

1. First connect asks for `gmail.modify` only. The user can read, send, archive, and Trash.
2. Permanent delete stays disabled until the user turns it on and grants `https://mail.google.com/`.
3. If that grant is missing, the button explains the limit. The app must not Trash instead and call it deleted.

## 6. Quotas and what indexing costs

Source: [Usage limits](https://developers.google.com/workspace/gmail/api/reference/quota), last updated 2026-09-10 UTC.

| Limit | Value |
| --- | --- |
| Per project per minute | 1,200,000 units |
| Per user per project per minute | 6,000 units |
| Daily billing threshold | 80,000,000 units per project. Usage under this is not billed. Google says charges may start later in 2026 with notice |

| Method | Units |
| --- | --- |
| `messages.list` | 5 |
| `history.list` | 2 |
| `messages.get` | 20 |
| `messages.attachments.get` | 20 |
| `messages.trash` | 20 |
| `messages.delete` | 10 |
| `messages.batchDelete` | 50 |
| `messages.send` | 100 |
| `watch` | 100 |

**Estimate, not a benchmark.** Header indexing is one `messages.get` per message at 20 units. At the per-user cap that is about 300 messages a minute. A 10,000-message header pass is on the order of 35 minutes if the app sits on the cap, and longer if it stays at half speed. A 100,000-message header pass is an overnight job. Body text is a second pass plus disk. Attachment contents are out of scope.

Cleanup does not need that index. Gmail's own `q` search (`older_than:1y`, `from:`, `larger:`) is the default. The local index is an optimization for saved views and for speeding repeat reviews.

**Verified limit to design around:** history is often kept about a week, sometimes less. A 404 on `history.list` means the cursor is dead and the app must rescan. Rescan lists ids. It does not download every body.

## 7. Local data model

SQLite. Secrets never go in this database.

```text
account
  id, provider, email, provider_user_id, display_name
  history_cursor, cursor_valid
  no tokens

message_ref
  account_id + provider_message_id   unique
  provider_thread_id
  imap_uid, imap_uidvalidity         null except IMAP
  internal_date, size_estimate
  from_addr, to_addrs, cc_addrs, subject
  unread, has_attachments
  label_or_folder_ids
  snippet                      optional, short, setting defaults off
  last_seen_at, missing_at

collection
  id, name, sort_order

collection_member
  collection_id, account_id, provider_message_id
  unresolved_at                set when the provider no longer has the message

saved_search
  id, name, account_id nullable, query_json

index_job
  id, account_id, scope_json, status, indexed_count, error

message_fts                  FTS5, only for opted-in scope
  account_id, provider_message_id, subject, from_addr, body_text

operation
  id, account_id, kind, requested_count, status
  per-id results             no bodies, no tokens
```

Kinds are `keep_local`, `add_to_collection`, `archive`, `trash`, `permanent_delete`. They are not a boolean.

Rules:

- Removing a collection member does not call the provider.
- Clearing an index deletes FTS rows and any stored body text. It does not delete provider mail.
- Disconnecting an account always deletes the keychain item. Local rows are deleted only if the user says so.
- The app still works with an empty index, using live search.
- Logs and operation rows must not contain MIME, tokens, or attachment bytes.

**Assumption:** SQLite FTS5 is enough. Do not add a second search engine until a measured mailbox misses a target the product actually sets. No target is set yet. Set one after the proof of concept, from a real timing, not a guess.

## 8. Search

1. Default path is live provider search. The UI says the search is live, still running, incomplete, or limited by the provider.
2. A user may index a folder, a date range, or the result of a search. Metadata first. Body text is a second switch, default off.
3. Attachment contents are not indexed.
4. Before Trash or permanent delete, Rust re-fetches the ids (`messages.get` format minimal, or the provider equivalent). Missing ids are dropped from the batch and reported. Stale index hits cannot delete a different message.
5. There is no mandatory offline body cache.

## 9. Destructive actions

Before a bulk Trash or permanent delete:

1. Show account, operation name, and count.
2. Permanent delete uses a second confirmation that is visually distinct from Trash. The copy says it cannot be undone on Gmail. On Microsoft, the copy must not say "instant and unrecoverable," because Graph puts the item in Purges and retention or a hold can keep it.
3. Revalidate ids.
4. Send batches. Default cap **assumption:** 50 messages per batch, under the quota budget, with progress.
5. Store a per-id success or failure. A partial failure is not a success.
6. Refresh the open view and mark local refs missing only after the provider confirms.
7. If the scope does not allow the operation, stop and explain. Do not substitute the other operation.

`messages.batchDelete` is also permanent and also requires `https://mail.google.com/`. Do not call it with a Trash-shaped confirmation.

## 10. Threat model

| Risk | What we do |
| --- | --- |
| Stolen refresh token | OS keychain only. Rust core holds it. UI and logs never see it |
| Malicious HTML mail | Sanitize in Rust before the webview. No scripts. Remote images off until the user allows them for that message |
| Bulk delete of the wrong ids | Revalidate, batch, per-id results, distinct confirmations |
| OAuth redirect theft | System browser, PKCE, state, loopback on 127.0.0.1 |
| Secret in a desktop binary | Public OAuth client. No pretended confidential secret |
| Mail in a backup of the SQLite file | Document it. Subjects and opted-in body text sit on disk. Full-disk encryption is the user's OS feature. App-level SQLCipher is **open**, not in v1 |
| Sync cursor gap | 404 forces a rescan. Destructive actions do not trust the cursor alone |
| Provider hold or retention | Surface the provider's result. Do not claim deletion the provider did not confirm |

No telemetry in v1. If it is added later, it is opt-in and it does not include message content or tokens.

## 11. Dependencies to pin at the start of Phase 1

Do not add these in Phase 0.

| Dependency | Role | Why |
| --- | --- | --- |
| Tauri 2 | Desktop shell, updater later | Small runtime, system webview |
| Rust (current stable) | Core | Token boundary, sync, SQLite |
| React + TypeScript | UI | Matches the brand shell already started |
| `reqwest` with rustls | HTTP | Gmail and Graph without OpenSSL |
| `oauth2` or a small PKCE implementation | Installed-app OAuth | System browser, no embedded secret |
| `keyring` | OS credential store | Tokens out of SQLite |
| `rusqlite` with bundled SQLite, FTS5 on | Local data | One file, migrations we own |
| `ammonia` | HTML sanitizer | Mail HTML cannot run script |
| A Rust MIME parser (`mail-parser`) | Read and send | Attachments fetched one at a time |
| `tokio` | Async and batch jobs | In-process, not a server |
| `tracing` with a redaction layer | Diagnostics | Must drop authorization headers and bodies |

Rejected for v1: Electron, Nylas, a Gmail Pub/Sub client, an attachment search engine, any Node mail library inside the UI.

Versions get pinned the day Phase 1 starts, then checked for advisories. They are not pinned here because this phase does not take the dependency.

## 12. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Restricted Gmail scopes block public install | High | High | Ship personal/testing first. Verification only after a distribution decision | Open |
| 2 | Permanent delete needs `mail.google.com` | Certain | High | Separate optional grant. Never fake it with Trash | Verified |
| 3 | Testing-mode tokens expire in 7 days | High, if still in Testing | Medium | Accept for the proof. Do not demo this as a product login | Assumption until consent-screen doc is quoted in Phase 1 |
| 4 | New quota makes body backfill slow | Certain relative to old 5-unit gets | Medium | Do not backfill bodies. Live search for cleanup | Verified cost model, not benchmarked |
| 5 | History gap deletes the cursor | Medium | Medium | 404 triggers id rescan, not a body mirror | Verified behavior |
| 6 | Microsoft "permanent" delete is delayed and hold-aware | Certain | Medium | Different confirmation copy. Test in Phase 7 | Verified docs, untested account |
| 7 | Yahoo and AOL need mail-scope approval and separate clients | High | Medium | Not in the first connector | Verified requirement, no app filed |
| 8 | Proton needs paid Bridge and is unsupported for a custom client | Certain for the paid-plan gate | Medium | Do not promise Proton in the first release | Verified 2026-10-10 |
| 9 | Linux has no Secret Service | Medium | High | Phase 2 fails closed on that machine until a fallback is approved | Open |
| 10 | HTML mail script or tracking pixels | High if unsanitized | High | Ammonia, remote images off | Design, not tested |
| 11 | Stale ids delete the wrong mail | Low if revalidated | Severe | Re-fetch ids, per-id results | Design, not tested |
| 12 | Long cleanup stops halfway | High | Medium | Batches, progress, partial failure report | Design, not tested |
| 13 | Tauri OAuth or packaging fails on one OS | Medium | High | Prove loopback OAuth before building the UI shell. Electron is the fallback | Open |
| 14 | Public launch needs CASA and a privacy policy | Medium | High | Do not promise a public launch date | Open |

## 13. Phase 1 proof — smallest thing that answers the brief

Not started. Needs the decisions in section 15.

A Rust CLI, one sacrificial Gmail account, fixtures created by the test itself:

1. Loopback OAuth with `gmail.modify`.
2. `messages.list` for a page of ids. Do not download the mailbox.
3. Live search with a unique subject the fixture just sent.
4. `messages.get` one message, render text in the terminal, do not write the body to SQLite.
5. Flip read state and read it back from Gmail.
6. Send one message to the same test account.
7. Trash one fixture. Confirm in a fresh `messages.get` that the Trash label is present.
8. If, and only if, a second login granted `https://mail.google.com/`, `messages.delete` a different fixture. Confirm a later get is 404. If the scope is absent, print the 403 and stop. Do not Trash it instead.
9. Write SQLite rows for the search hits (ids, subject, date). Search that table. Delete the table. Confirm the Gmail messages are still there.
10. Trash one fixture in the Gmail website. Next `history.list` or rescan marks the local ref missing.

Exit: those ten steps pass on the test account, or the exact Google error is written down.

Do not use a personal archive. Do not build the three-pane UI in this phase.

## 14. Test plan for that proof

| Check | Pass |
| --- | --- |
| List | Returns ids without a local body table |
| Search | Finds the fixture subject via `q`, not via SQLite |
| Open | Body shown once, file on disk does not contain it afterward |
| Read state | Gmail `UNREAD` label matches the action |
| Send | Message arrives on the test account, From is that account |
| Trash | Provider label is Trash. Local row removal is not used as proof |
| Permanent delete | 404 after delete, or a recorded 403 when the scope is missing |
| Wrong scope | App does not call `messages.delete` |
| Stale id | A deleted id is reported skipped. Neighbors in the batch are unchanged |
| Clear index | SQLite empty of those rows. Gmail still has the messages |
| Restart | Keychain token still works. SQLite collections still exist. No token in the db file |
| Log scan | Log file has no `Authorization` value and no MIME body |

Phase 2 and later add packaging, keychain behavior per OS, HTML sanitizer fixtures, migration tests, and rate-limit backoff. Performance targets are set after this proof has a number, not before.

## 15. Decisions — approved 2026-10-10

Jeff approved all nine with “G2g approval all.”

1. **Stack.** Tauri 2 + Rust core + React UI. Electron only if Phase 2 proves Tauri cannot complete OAuth on an OS.
2. **Permanent delete grant.** `gmail.modify` at connect. `https://mail.google.com/` only when permanent delete is turned on.
3. **Phase 1 shape.** Rust CLI proof, not the desktop shell.
4. **Test account.** `jjgumballs@gmail.com` may be the disposable test mailbox only. It must not own the Google Cloud project, the OAuth client, or the brand. The project is created under whatever Google account Jeff wants as owner. That address is added only as a consent-screen test user, and only if he still wants tests in that inbox.
5. **Sync.** Poll `history.list`. No Gmail Pub/Sub and no public webhook in v1.
6. **Index default.** Optional metadata index only. No message bodies. No attachment contents in v1.
7. **Audience.** Personal and Testing-mode use until Jeff asks for public Google verification.
8. **Linux credentials.** If Secret Service is missing, refuse to store a token. No homemade password vault in v1.
9. **Brand.** Letter Llama. Repo: https://github.com/El-Jeffe81/letter-llama

Phase 1 code lives in `phase1/`. Live Gmail steps stay unrun until the desktop client id is provided.

## 16. What this phase did not do

- No provider login.
- No delete, Trash, or send.
- No Tauri project.
- No new runtime dependencies.
- No claim that the ten proof steps pass.
