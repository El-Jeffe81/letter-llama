# Letter Llama

Local mailbox app. The file you open is [Letter-Llama.html](Letter-Llama.html). Download it and open it in a browser. No installer.

It can send, reply, file into piles, trash, and permanently delete. Permanent delete asks twice and does not fall back to trash.

Gmail is not connected. The Rust core in `phase1/` is the safety proof for a later provider connection. Do not commit `phase1/.env`.

The desk source that feeds the chat preview is `src/components/desk-app.tsx` and `src/lib/desk-store.ts`.
