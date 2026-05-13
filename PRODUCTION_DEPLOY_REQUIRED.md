# Production Deploy Required

Production deployment could not be verified or triggered from this workspace.

Current verified status:

* latest local commit: `d83c018 fix supabase image upload stabilization`
* `vercel` CLI is not installed here
* `.vercel` project link is not present here

Because this machine has no Vercel CLI/project linkage, production deploy was **not** triggered from here.

## Manual Vercel Steps

1. Open the Vercel Dashboard.
2. Open the **AutoPost Studio** project.
3. Go to **Deployments**.
4. Verify the connected Git branch is the production branch you expect.
5. Verify the newest deployment includes commit:
   * `d83c018 fix supabase image upload stabilization`
6. If it does not, trigger **Redeploy** for commit `d83c018`.
7. After deployment completes, hard refresh production with `Ctrl + F5`.
8. If the old UI or old behavior remains, open production in an incognito window.

## Production QA After Redeploy

1. Upload a jpg/png/webp image.
2. Confirm the fallback warning does not appear.
3. Save draft.
4. Reload draft.
5. Confirm `image_url` resolves to a public `https://...supabase.co/storage/v1/object/public/...` URL.
6. Confirm real publish no longer sends `blob:` / `file:` / `localhost:` / temporary URLs.
