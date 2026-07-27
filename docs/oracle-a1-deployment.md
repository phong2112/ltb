# Oracle Cloud A1 API Deployment

This guide migrates only the NestJS API from Render to an Oracle Cloud
Infrastructure (OCI) Ampere A1 VM. Keep the existing Vercel frontend, Neon
PostgreSQL database, managed Redis, private Ollama endpoint, Cloudflare R2, and
Vercel Blob storage.

The production request path is:

```text
Vercel frontend
  -> https://api.example.com
  -> Caddy on the OCI A1 VM
  -> NestJS API container
  -> Neon / managed Redis / private Ollama / R2 / Vercel Blob / Gmail API
```

The OCI Compose file exposes only TCP ports 80 and 443. PostgreSQL, Redis,
Ollama, and CV objects remain outside the VM. Local upload paths are temporary
filesystems so CV files are not retained on the server.

## 1. Prepare The Cutover

Before creating the VM:

- Choose a dedicated API hostname such as `api.example.com`.
- Create a current Neon restore point or branch before the first OCI deploy.
- Keep the Render service active until the OCI smoke test passes.
- Keep the existing Vercel production deployment available for rollback.
- Copy secrets from Render and the local `.env.dev` through a secure channel.
  Never commit or paste them into an issue or deployment log.

The OCI environment requires Neon's direct connection string in
`MIGRATION_DATABASE_URL`. The API uses the pooled `DATABASE_URL` after Prisma
migrations complete.

## 2. Create The A1 VM

In the OCI Console, create a Compute instance with:

```text
Image:       Ubuntu 24.04 aarch64
Shape:       VM.Standard.A1.Flex
CPU/RAM:     2 OCPUs / 12 GB memory
Boot volume: 50 GB
Network:     Public IPv4 address
```

Use the Always Free-eligible shape and boot volume shown by the OCI Console.
Free A1 capacity is not guaranteed in every availability domain.

Add these ingress rules to the subnet security list or network security group:

| Source | Protocol | Port | Purpose |
| --- | --- | --- | --- |
| Your public IP `/32` | TCP | 22 | SSH administration |
| `0.0.0.0/0` | TCP | 80 | ACME certificate issuance and HTTP redirect |
| `0.0.0.0/0` | TCP | 443 | Public API HTTPS |

Do not expose ports 4000, 5432, 6379, or 11434. Keep outbound access enabled so
the API can reach HTTPS services and the Gmail API on port 443.

Create an `A` record for the API hostname pointing to the VM public IPv4
address. Caddy obtains the TLS certificate automatically after DNS resolves and
ports 80/443 reach the VM.

## 3. Bootstrap Ubuntu

SSH to the VM, clone the repository, and run the checked-in bootstrap script:

```bash
ssh ubuntu@<oci-public-ip>
sudo apt-get update
sudo apt-get install --yes git
git clone <repository-url> hr-copilot
cd hr-copilot
sudo bash deploy/oci/bootstrap-ubuntu.sh
```

Log out and back in after the script finishes so the `docker` group applies:

```bash
exit
ssh ubuntu@<oci-public-ip>
cd hr-copilot
docker compose version
```

The bootstrap script enables Docker, unattended security updates, and UFW. UFW
allows only SSH, HTTP, and HTTPS inbound. OCI network rules must also allow the
same ports.

## 4. Configure Production Secrets

Create the ignored OCI environment file on the VM:

```bash
cp deploy/oci/.env.example deploy/oci/.env
chmod 600 deploy/oci/.env
nano deploy/oci/.env
```

Copy the current production values for database, storage, authentication, and
email. Generate new JWT secrets when possible:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Important values:

```text
API_DOMAIN=api.example.com
WEB_ORIGIN=https://<production-vercel-domain>
WEB_ORIGINS=https://<production-vercel-domain>,https://<preview-pattern>
DATABASE_URL=<neon-pooled-url>
MIGRATION_DATABASE_URL=<neon-direct-url>
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
TRUST_PROXY_HOPS=1
CV_STORAGE_DRIVER=r2
CV_ARCHIVE_STORAGE_DRIVER=vercel-blob
```

Use URL-encoded database credentials. If an environment value contains `$`,
`#`, or spaces, wrap it in single quotes in `deploy/oci/.env`.

For AI processing, copy the managed production values from Render:

```text
AI_PROVIDER=ollama
REDIS_URL=<managed-redis-url>
OLLAMA_BASE_URL=<private-ollama-url>
OLLAMA_MODEL=qwen3:4b
OCR_MAX_PAGES=10
OCR_MIN_CONFIDENCE=55
OCR_TIMEOUT_MS=120000
```

The Ollama endpoint must be reachable from the OCI VM without making it an
unauthenticated public service. Use the existing private networking or access
control arrangement. Set `AI_PROVIDER=disabled` only for an initial
infrastructure smoke test if Redis or Ollama is not ready.

For the Gmail API, obtain OAuth2 credentials as described in
[gmail-api-email-setup.md](gmail-api-email-setup.md):

```text
EMAIL_PROVIDER=gmail
EMAIL_FROM="Lường Bích <your-address@gmail.com>"
EMAIL_REPLY_TO=your-address@gmail.com
GMAIL_CLIENT_ID=<oauth2-client-id>.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=<oauth2-client-secret>
GMAIL_REFRESH_TOKEN=<oauth2-refresh-token>
```

Verify that the VM can reach the Gmail API before deploying:

```bash
timeout 15 openssl s_client \
  -connect gmail.googleapis.com:443 \
  -servername gmail.googleapis.com \
  -brief </dev/null
```

A successful TLS handshake confirms that OCI is not blocking outbound HTTPS.
It does not validate the OAuth2 credentials. Because the Gmail API uses HTTPS
(port 443) rather than SMTP, no special outbound SMTP access is required.

## 5. Validate And Deploy

Validate Compose and required environment values:

```bash
./deploy/oci/deploy.sh check
```

Build the API natively for ARM64 and start the API and Caddy:

```bash
./deploy/oci/deploy.sh deploy
```

The API container runs `prisma migrate deploy` before NestJS starts. The deploy
script waits up to five minutes for `/health` to become healthy and prints the
last API logs if startup fails.

Useful operational commands:

```bash
./deploy/oci/deploy.sh status
./deploy/oci/deploy.sh logs
./deploy/oci/deploy.sh smoke
```

The public smoke test should return JSON containing `"status":"ok"`:

```bash
curl https://api.example.com/health
curl https://api.example.com/jobs
```

## 6. Verify Before Switching Vercel

Create a Vercel preview deployment with:

```text
VITE_API_BASE_PATH=https://api.example.com
VITE_MAX_CV_FILE_SIZE_MB=10
```

From the preview frontend, verify:

- Admin login succeeds and cookies remain `Secure`, `HttpOnly`, and
  `SameSite=None`.
- Published jobs load.
- A test application submits successfully.
- The test CV is stored privately in R2, not on the OCI filesystem.
- Neon receives the application and file metadata.
- The Redis extraction job completes and the private Ollama endpoint responds.
- The candidate receives the Gmail confirmation email.
- API and Caddy logs do not contain secrets or full CV text.

Use a synthetic test CV. Do not upload a real candidate CV during the
infrastructure smoke test.

## 7. Production Cutover

After the preview verification passes:

1. Set the Vercel Production `VITE_API_BASE_PATH` to the OCI API URL.
2. Redeploy the Vercel frontend.
3. Repeat login, job list, application, CV, AI, and email checks in production.
4. Confirm new requests appear in OCI logs and stop appearing in Render logs.
5. Suspend the Render service after the production checks pass.
6. Disable `.github/workflows/render-keep-alive.yml` or remove its
   `RENDER_HEALTH_URL` repository variable after Render is no longer the
   rollback target.

Do not terminate Render before Vercel production is confirmed. Running both API
instances briefly against the same Neon database is acceptable during the
cutover, but both instances must use compatible application code and schema.

## 8. Update And Roll Back

Deploy a later revision from the OCI VM:

```bash
git pull --ff-only
./deploy/oci/deploy.sh deploy
```

For an application rollback:

1. Promote the previous Vercel deployment so requests return to Render.
2. Resume the Render service if it was suspended.
3. Check out the previously tested Git revision on OCI and redeploy it.

```bash
git checkout <previous-tested-commit>
./deploy/oci/deploy.sh deploy
```

Prisma migrations are forward migrations. Reverting application code does not
revert the Neon schema, so confirm schema compatibility and keep a Neon restore
point before each migration-bearing release.

Stop OCI containers without deleting Caddy certificate volumes:

```bash
./deploy/oci/deploy.sh stop
```

## 9. Ongoing Checks

- Apply Ubuntu security updates regularly and reboot when required.
- Review `docker system df` and rotate/remove unused images.
- Monitor OCI boot volume, memory, CPU, and public network use.
- Monitor Neon, Redis, R2, Vercel Blob, Ollama, and Gmail quotas separately.
- Keep the VM active and monitored; OCI can reclaim idle Always Free compute.
- Test database restoration and R2/Vercel Blob access before a real launch.
- Use paid infrastructure with backups and uptime monitoring when the site
  becomes a production service for real candidate data.
