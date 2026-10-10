# OAuth clients

Jeff asked on 2026-10-10 to connect a test Gmail account. The mailbox has a **Connect Gmail** button. See the README section "Gmail test".

## Desktop client already in the repo

`193372328813-i4rag2qrs1rpl2eu2qknclk0l6i85nls.apps.googleusercontent.com`

This is a Desktop client. Google will not use it for a browser sign-in. No client secret was provided. Do not ask for a password. Nobody has signed in.

## What the browser needs

A second client, type **Web application**, with JavaScript origins for the page Jeff actually opens. The test user is `jjgumballs@gmail.com`. That address is not the owner. See [OWNERSHIP.md](OWNERSHIP.md).
