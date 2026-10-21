---
name: clarteon-deploy
description: Deploy the Clarteon site to Vercel through GitHub Actions: how pushes and pull requests deploy, onboarding a repository with the shared setup script, the VERCEL_TOKEN secret and project variables, Instant Rollback and token rotation. Use whenever the task mentions deploying, Vercel, production, preview URLs, a deploy that did not happen, rollback, or the Vercel token.
---

# Deploys

Goal: tested code on `main` goes live without anyone running a deploy by hand.

Follow `.agents/rules/security.md`. The shared workflow and its full docs live in `Clarteon/.github` (`.github/workflows/vercel-deploy.yml` and the README's Deployments section).

## How it works

- Vercel's Git integration does not support private organization repositories on the Hobby plan, so the Vercel project has no Git connection. The `deploy` job in `.github/workflows/ci.yml` calls `vercel-deploy.yml` after `ci` and `browser` pass.
- A push to `main` deploys production. A pull request from a branch in this repository deploys a preview and posts its URL as a pull request comment. Pull requests from forks are skipped.
- The job needs the `VERCEL_TOKEN` repository secret and the `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` repository variables (IDs from `.vercel/project.json`, not secrets). GitHub Free does not share organization secrets with private repositories, so the token is set per repository.
- Do not reconnect a Git repository in the Vercel project, or every push deploys twice.

## Rules

- Never run `vercel --prod` by hand, except in an emergency when Actions is down. Say so in the commit or chat when it happens.
- Never print, log or commit the token. Pass it only as the `VERCEL_TOKEN` secret, never through `secrets: inherit`.
- The Vercel Hobby plan is for non-commercial use only. Moving to Pro is a human decision; flag it, do not decide it.

## Onboard a repository

From the repository root, with `gh` signed in as someone who can manage its secrets:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Clarteon/.github/v1.1.0/scripts/setup-vercel-deploy.sh)
```

The script links the Vercel project, sets the two variables and asks for the token without echoing it. Create the token in Vercel under Account Settings, Tokens, scoped to the team, expiring in 90 days or less.

## Roll back

Use Instant Rollback on the previous production deployment in the Vercel dashboard, then revert the bad commit on `main` so the next push does not redeploy it.

## Rotate the token

Create a new token, run `gh secret set VERCEL_TOKEN --repo Clarteon/Marketing`, re-run the latest deploy, then delete the old token. Rotate immediately if it may have been exposed.

## Check a deploy

- The run summary of the `deploy` job shows the URL and target.
- After a production deploy, check the live site: share image, structured data, the analytics beacon, the security headers and a 404 page.
- Previews build without Vercel's system variables (`--prebuilt`). If forms reject requests on a preview, check that `NEXT_PUBLIC_SITE_URL` is set for the Preview environment in Vercel.
