# Letter Llama

Local mailbox you open in a browser. No installer and no server.

Open [index.html](index.html), or use this link:

https://htmlpreview.github.io/?https://github.com/El-Jeffe81/letter-llama/blob/main/index.html

GitHub Pages is not turned on. The token used here cannot change that setting. To get `https://el-jeffe81.github.io/letter-llama/`, open the repo Settings, Pages, and deploy from the `main` branch, folder `/`. `index.html` is already the site root.

If this file disagrees with an older note in `docs/`, this file wins.

## What you are looking at

`index.html` and `Letter-Llama.html` are the same app. Keep them identical. The mailbox is one HTML file. Mail stays in the browser under the localStorage key `letter-llama-mailbox-v2`. Nothing is sent to a real inbox.

The app starts with practice mail so it can be used with no sign-in.

## How the mailbox works

- Left rail: **New mail**, **Inbox**, folders, **Sent**, **Trash**, **Rules**.
- Folders are children of Inbox. They sit directly under Inbox, indented. **+ Add** creates one. There is no separate Folders block.
- Drag a message onto Inbox, Trash, or a folder.
- The list has a checkbox on each row and a check-all box. Trash, Move, and Delete forever act on the checked rows.
- Search is the bar at the top. **Filters** adds from, to, subject, body, date range, attachments, and read or unread.
- The open letter is on the right.
- **New mail** opens a compose pane across the top, about a third of the screen. Reply is on the open letter.
- **Trash** moves mail to Trash. The small arrow beside Trash is **Delete forever**. That opens a confirmation popup. Delete forever removes the message. It does not move it to Trash.
- **Set aside** was removed. It was an archive, not "mark read" and not "look at later." On load, any saved letter still marked archived is put back in the Inbox.
- Rules can trash matches, move matches to Inbox, or delete matches forever. Delete forever still asks before it runs.

## Look

Mail-client layout: dark folder rail, light message list, reading pane on the right. The structure follows Gmail, Yahoo Mail, Proton Mail, and Outlook. The colors and the llama are Letter Llama, not a copy of those products.

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#07111F` | Folder rail |
| Cobalt | `#2F7DE1` | New mail, selection, avatars |
| Brass | `#C6A15A` | Small accent |
| Paper | `#F4EFE4` | Light surfaces |

Wordmark: Fraunces. UI: Outfit.

## Logo

Use [4-legged-llama.jpg](4-legged-llama.jpg). Four legs, head to the left, one cream satchel on the side of the ribs. Not on the neck. Not on the rump. This file is also embedded in the HTML as the header image and the favicon.

[standing-llama.jpg](standing-llama.jpg) is a saved alternate: a standing bust, one satchel on a sash. It is not the app icon.

Files named `logo-pack-llama` or `logo-carrier-llama` are rejected drafts. Do not use them.

## Gmail test

The Cloud project is under `jjgumballs@gmail.com` for this test. That account will not own Letter Llama long term. The long-term Google account is not chosen yet. Do not make a second project until it is.

The client id already in the repo is a **Desktop** client. A browser sign-in needs a **Web application** client. Until that exists, Connect Gmail will be refused by Google.

In Google Cloud, on the account that owns the project:

1. APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
2. Authorized JavaScript origins: `https://htmlpreview.github.io` and `http://127.0.0.1` and `http://localhost`.
3. OAuth consent screen → Audience → Test users → add `jjgumballs@gmail.com`.
4. Put the new client id in `Letter-Llama.html` as `GMAIL_CLIENT`, then copy that file over `index.html`.

Do not send a client secret. First sign-in asks only for `gmail.modify` (read, send, trash). Delete forever asks a second time for `https://mail.google.com/`. The token stays in the browser. It is not committed.

Folders are still local. Dragging Gmail onto a folder does not file it in Gmail yet.

## What is not built

- There is no Windows, Mac, or phone install.
- `phase1/` is a Rust command-line proof. It is not wired to the HTML app. Its tests use a fake Gmail. No one has signed in. See [docs/phase-1.md](docs/phase-1.md) and [docs/oauth-client.md](docs/oauth-client.md).
- `src/` is an older React desk. Editing it does not change the mailbox. The mailbox is the HTML file.

## Decisions already made

- Brand name is Letter Llama. Owner is Jeff (`El-Jeffe81`).
- `jjgumballs@gmail.com` is the test mailbox and the account that currently holds the Cloud project. It will not be the long-term owner. The long-term Google account is not chosen yet. See [docs/OWNERSHIP.md](docs/OWNERSHIP.md).
- Fix the look before connecting Gmail.
- Providers, when connected later, stay the source of truth. Trash and permanent delete stay different operations. Do not turn one into the other.
- Do not add Set aside back unless Jeff asks.

## Where to change things

1. Edit `Letter-Llama.html`.
2. Copy it over `index.html`.
3. Commit both.

Practice mail and the logo data URL live in that file. The visible logo file is `4-legged-llama.jpg`.
