# Aspose.ai Website Health

Public leadership snapshot of Aspose.ai website health. This repo is static only: HTML plus a daily `dashboard.json` and screenshots. The monitoring agent stays in the private GitLab project.

Demo URL after Pages is enabled:

https://aspose.github.io/aspose-ai-website-health/

## Enable GitHub Pages

The option does **not** appear on the “create repository” screen. Enable it after the first push.

### Option A — Settings (required the first time)

The Actions error `Get Pages site failed` means Pages is not enabled yet. The workflow cannot start until you do this once:

1. Open https://github.com/Aspose/aspose-ai-website-health
2. **Settings** (repo menu, not your profile)
3. Left sidebar: **Pages**
4. **Build and deployment → Source**: **GitHub Actions**
5. Save
6. Open **Actions**, open the failed **Deploy GitHub Pages** run, click **Re-run all jobs**

You need Admin or Maintain access. If you do not see **Settings**, ask an Aspose org owner.

### Option B — this repo already includes a workflow

`.github/workflows/pages.yml` deploys on every push to `main`. The first run may ask you to approve the **GitHub Actions** Pages source under **Settings → Pages**.

## Refresh the snapshot (from the private agent repo)

```bash
cd backend
source .venv/bin/activate
aspose-agent publish-static --run availability,links
```

Then copy `frontend/dashboard.json` and `frontend/screenshots/` into this repo, commit, and push.
