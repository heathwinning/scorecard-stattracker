# Deployment Setup — Cloudflare Pages + D1

This app deploys to Cloudflare Pages with D1 via GitHub Actions. One push to `main` = automatic deploy.

---

## 1. Prerequisites

- [ ] Cloudflare account (free tier works)
- [ ] GitHub repo (private or public)
- [ ] Google Cloud project (for OAuth)

## 2. Create D1 Database

```bash
npm run db:create
# → Save the database_id from output
```

Copy the `database_id` into `wrangler.toml` replacing `"scorecard-db"` in the `database_id` field.

## 3. Run Migrations & Seed

```bash
npm run db:migrate:prod
npm run db:seed:prod
```

## 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized origins:
   - `http://localhost:3000` (dev)
   - `https://scorecard.pages.dev` (prod — or your custom domain)
4. Note the **Client ID** and **Client Secret**

## 5. GitHub Secrets & Variables

Go to **GitHub → Settings → Secrets and variables → Actions**:

### Secrets (encrypted):
| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | From Cloudflare Dashboard → My Profile → API Tokens → Create Token (Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | From Cloudflare Dashboard → Workers & Pages → Account ID |

### Variables (not encrypted, used at build time):
| Name | Value |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `NEXT_PUBLIC_APP_URL` | `https://scorecard.pages.dev` (or your domain) |

## 6. Cloudflare Secrets (for runtime)

These are passed to the Functions runtime, not bundled at build time:

```bash
npx wrangler secret put SESSION_SECRET
# → Paste a random 64-character string

npx wrangler secret put GOOGLE_CLIENT_ID
# → Paste your Google client ID

npx wrangler secret put GOOGLE_CLIENT_SECRET
# → Paste your Google client secret
```

## 7. Create Cloudflare Pages Project

```bash
npm run cf:deploy
```

Or go to Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → select repo.

**Build settings:**
- Build command: `npx @cloudflare/next-on-pages`
- Build output directory: `.vercel/output/static`

## 8. Push to Deploy

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

GitHub Actions will:
1. Build the Next.js app
2. Run D1 migrations
3. Seed default templates
4. Deploy to Cloudflare Pages

## Local Development

```bash
npm run dev                    # Next.js dev server
npm run db:migrate:local       # Set up local D1
npm run db:seed:local          # Seed default templates
```

## Useful Commands

```bash
npm run cf:build               # Build for Cloudflare (without deploying)
npm run cf:deploy              # Build + deploy manually
npm run db:migrate:prod        # Run migrations on production D1
npm run db:seed:prod           # Seed production D1
```

## Environment Variables Summary

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | GitHub Variables | Frontend base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | GitHub Variables | Google Sign-In (browser) |
| `GOOGLE_CLIENT_ID` | Cloudflare Secrets | Google token verification (server) |
| `GOOGLE_CLIENT_SECRET` | Cloudflare Secrets | Google token verification (server) |
| `SESSION_SECRET` | Cloudflare Secrets | JWT signing key |
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | Deploy permissions |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | Account identifier |
