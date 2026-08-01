# Visual Testing

For visual checks, use a persistent headed Playwright/Chrome window that the user can see. Do not use headless browser automation unless the user explicitly asks for it.

# Local Development and Deployment

Do not use `next dev`: it does not provide the Cloudflare D1 binding and causes API requests to fail. Seed the local D1 database, then use `npm run dev`, which builds the Pages output and runs the Cloudflare Pages emulator.

Deploy through GitHub Actions by committing and pushing `main`. The workflow builds the app, initializes and seeds production D1, then deploys Cloudflare Pages. Do not use `npm run cf:deploy` as a replacement for this workflow unless the required production database work has already been completed.
