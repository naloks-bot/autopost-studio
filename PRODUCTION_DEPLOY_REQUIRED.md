# Production Deploy Required

Production deployment could not be verified or triggered from this workspace.

Current verified status:

* latest pushed commit: `4bdf111 fix live facebook publish page config path`
* `vercel` CLI is not installed here
* `.vercel` project link is not present here
* `supabase` CLI is not installed here
* `SUPABASE_ACCESS_TOKEN` is not available in this workspace

Because this machine has no Vercel CLI/project linkage, production frontend deploy could not be verified or triggered from here. Because this machine also has no Supabase CLI/auth token, the updated `process-scheduled-posts` Edge Function was **not** deployed from here.

## Manual Vercel Steps

1. Open the Vercel Dashboard.
2. Open the **AutoPost Studio** project.
3. Go to **Deployments**.
4. Verify the connected Git branch is the production branch you expect.
5. Verify the newest deployment includes commit:
   * `4bdf111 fix live facebook publish page config path`
6. If it does not, trigger **Redeploy** for commit `4bdf111`.
7. After deployment completes, hard refresh production with `Ctrl + F5`.
8. If the old UI or old behavior remains, open production in an incognito window.

## Manual Supabase Edge Function Steps

1. Open a machine with Supabase CLI authenticated for project `qydjsobtspoykhzcckht`.
2. Pull this repository at commit `4bdf111`.
3. Run `supabase functions deploy process-scheduled-posts`.
4. Confirm the deployed function still has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` configured.
5. Trigger one scheduler run from cron-job.org or the GitHub Actions manual fallback and confirm HTTP `200`.

## Production QA After Redeploy

1. Hard refresh production.
2. Open Manage Pages and confirm **AI ทำกิน** is selected.
3. Re-save the page token only if needed.
4. Create and approve one test post.
5. Schedule 10-15 minutes ahead or use manual post if safe.
6. Check Logs for `publish_diagnostics` with sanitized page/token/endpoint fields.
7. Confirm `publish_completed` is success, or capture the exact new error.
