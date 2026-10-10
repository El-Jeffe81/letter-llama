# Letter Llama — Phase 0

Reviewed 2026-10-10 against current official docs. No mailbox was connected. Nothing here was executed against Gmail.

Labels: **Verified** means an official page said it. **Assumption** is a recommended default, not a measured fact. **Open** still needs a decision or a live test.

This phase does not build the app. The exit criterion in the brief (a live Gmail delete) is **not met**. The blocker is documented below: there is no Google Cloud OAuth client and no sacrificial test mailbox in this environment.

The full record is maintained with the project. Section 15 is the approval list.

## Recommendation

Tauri 2 shell, Rust core, React UI. Phase 1 is a Rust CLI against a sacrificial Gmail account, not the desktop shell.

First connect uses `gmail.modify` (read, send, archive, Trash). Permanent delete uses a separate later grant of `https://mail.google.com/` because that is the only scope `users.messages.delete` accepts. Google says that call cannot be undone. `gmail.modify` explicitly cannot do it.

Microsoft `permanentDelete` is not the same operation: it moves mail into the Purges folder, and a hold or retention can keep it. Yahoo and AOL need OAuth mail-scope approval and separate client credentials. Proton requires a paid Proton Mail Bridge on localhost. None of those are the first connector.

Live cleanup uses Gmail search. A selective SQLite FTS index is optional, metadata first, body text off by default. No attachment indexing. No full mailbox copy. Tokens live in the OS keychain, never in SQLite.

## Blockers

1. No Google Cloud desktop OAuth client and no sacrificial Gmail here, so live Trash and permanent delete were not demonstrated.
2. Restricted scopes (`gmail.modify`, `gmail.readonly`, and `https://mail.google.com/`) block a clean public install until Google verifies the app. A security assessment applies if restricted data is stored or transmitted through a server. Testing-mode use is the planned first audience. The 7-day refresh-token limit is an assumption to confirm before coding login.
3. Gmail quota as of 2026-09-10 is 6,000 units per user per minute, and `messages.get` costs 20. Header-indexing a large mailbox is an overnight job. Do not backfill bodies.
4. History records typically last at least a week, sometimes less. A 404 on `history.list` forces an id rescan, not a body mirror.
5. Tauri loopback OAuth on all three operating systems is an assumption until Phase 2. Electron is the fallback for an OS that fails, not a reason to add a server.

## Decisions still required

See the numbered list in the local Phase 0 record, section 15. Do not start Phase 1 until Jeff approves them.
