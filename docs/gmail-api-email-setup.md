# Gmail API Email Setup (OAuth2)

The confirmation email feature sends mail through the **Gmail API over HTTPS**
instead of SMTP. This lets you send from your own `@gmail` address without a
verified domain, and it works on hosts that block outbound SMTP ports (25 / 465
/ 587) — including Render's free tier.

You need three values in the API environment:

```text
GMAIL_CLIENT_ID=<oauth2-client-id>.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=<oauth2-client-secret>
GMAIL_REFRESH_TOKEN=<oauth2-refresh-token>
```

Plus the display sender:

```text
EMAIL_PROVIDER=gmail
EMAIL_FROM="Lường Bích <your-gmail-address@gmail.com>"
EMAIL_REPLY_TO=your-gmail-address@gmail.com
```

`EMAIL_FROM` must use the **same Gmail account** you authorize below — the Gmail
API sends as the authenticated user (`users/me`).

---

## 1. Create a Google Cloud project

1. Open <https://console.cloud.google.com/> and sign in with the Gmail account
   you want to send from.
2. Top bar → project dropdown → **New Project**. Name it (e.g. `ltb-mailer`) and
   create it. Select it once created.

## 2. Enable the Gmail API

1. Go to **APIs & Services → Library**
   (<https://console.cloud.google.com/apis/library>).
2. Search **Gmail API**, open it, click **Enable**.

## 3. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External**. Click **Create**.
3. Fill required fields (app name, user support email, developer contact email).
   Save and continue.
4. **Scopes** step: you can skip adding scopes here (we request the scope during
   token generation). Save and continue.
5. **Test users** step: click **Add users** and add the Gmail address you are
   sending from. Save and continue.
6. Leave the app in **Testing** mode. That is fine for a single sender.

> Note: in Testing mode, a refresh token normally expires after **7 days**. To
> get a **non-expiring** refresh token, set the app to **Published / In
> production** (OAuth consent screen → **Publish app**). Since you only use the
> restricted `gmail.send` scope for your own account, you do not need Google
> verification for personal use — publishing simply stops the 7-day expiry.
> **Recommended: publish the app** so the token does not expire.

## 4. Create OAuth client credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Under **Authorized redirect URIs**, add:
   ```
   https://developers.google.com/oauthplayground
   ```
4. Create. Copy the **Client ID** → `GMAIL_CLIENT_ID` and the **Client secret**
   → `GMAIL_CLIENT_SECRET`.

## 5. Get the refresh token (OAuth Playground)

1. Open <https://developers.google.com/oauthplayground/>.
2. Click the **⚙ gear** (top right) → check **Use your own OAuth credentials**.
   Paste your **Client ID** and **Client secret**. Close the panel.
3. In **Step 1** (left list), find and paste this scope into the
   "Input your own scopes" box, then click **Authorize APIs**:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
4. A Google sign-in appears. Choose the **same Gmail account** you added as a
   test user. You will see an "unverified app" warning — click
   **Advanced → Go to <app> (unsafe)** and allow. (This warning is expected for
   a Testing/personal app.)
5. Back in the Playground, **Step 2**: click **Exchange authorization code for
   tokens**.
6. Copy the **Refresh token** value → `GMAIL_REFRESH_TOKEN`.

> The `gmail.send` scope only permits sending — it cannot read your inbox.

## 6. Set the environment variables

Local (`.env`) or your host's env config (Render dashboard, `docker-compose`
env, OCI `.env`):

```text
EMAIL_PROVIDER=gmail
EMAIL_FROM="Lường Bích <your-gmail-address@gmail.com>"
EMAIL_REPLY_TO=your-gmail-address@gmail.com
GMAIL_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxxxxx
GMAIL_REFRESH_TOKEN=1//xxxxxxxx
```

If any of `EMAIL_FROM`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, or
`GMAIL_REFRESH_TOKEN` is blank, the API still accepts applications but silently
skips the confirmation email (logged once as a warning).

## 7. Verify

Submit a test job application (or trigger the confirmation flow) and confirm the
candidate receives the email. On the server, a failure surfaces as a
`Gmail API send failed (...)` error in the logs.

---

## Limits and notes

- **Sending quota:** a free Gmail account allows roughly **500 recipients/day**.
  That is well above the low-volume confirmation use case. Google Workspace
  accounts allow ~2,000/day.
- **No SMTP ports needed:** all traffic is HTTPS to
  `gmail.googleapis.com:443`, so no host-level SMTP unblocking is required.
- **Token rotation:** if you ever revoke access (Google Account → Security →
  Third-party access) or change the client secret, regenerate the refresh token
  via step 5.
- **`invalid_grant` errors** usually mean the refresh token expired (Testing
  mode 7-day limit — publish the app) or was revoked. Regenerate it.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Emails never send, warning in logs | One of the `GMAIL_*` / `EMAIL_FROM` vars is blank | Set all four |
| `Gmail API send failed (401 ...)` `invalid_grant` | Refresh token expired/revoked | Regenerate (step 5); publish the app to avoid 7-day expiry |
| `Gmail API send failed (403 ...)` | Gmail API not enabled, or sender not the authorized account | Enable Gmail API (step 2); ensure `EMAIL_FROM` matches the authorized account |
| `access token could not be obtained` | Wrong client ID/secret vs. the token | Re-copy credentials; regenerate token with those exact credentials |
