# Phase 1 — Rust CLI

Approved 2026-10-10. Crate: `phase1/`. 15 unit tests passed against a fake Gmail and a local SQLite file. No live call to jjgumballs@gmail.com.

## Proven by tests

- `gmail.modify` cannot call `messages.delete`, and it does not Trash instead.
- Trash is `POST .../trash`. Permanent delete is `DELETE` and only with `https://mail.google.com/`.
- A missing id is skipped. The neighbor in the batch still goes through.
- First login asks only for `gmail.modify`. Permanent login asks only for `https://mail.google.com/`.
- SQLite `message_ref` has no body column. Clearing it does not call Gmail.
- History HTTP 404 means the cursor is dead.

## Not proven

Live list, search, send, trash, and delete against the test mailbox. Needs a Desktop OAuth client id.

## What Jeff does next

1. Google Cloud project. Enable the Gmail API.
2. Consent screen: External, Testing, test user `jjgumballs@gmail.com`.
3. Create an OAuth client of type Desktop.
4. Send the client id only. Not a password.

Then: `LETTER_LLAMA_CLIENT_ID=... letter-llama auth`
