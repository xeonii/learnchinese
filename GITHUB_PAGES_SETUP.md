# GitHub Pages Setup Instructions

## Status
✅ GitHub Actions workflow configured  
✅ Vite base path set to `/learnchinese/`  
⏳ GitHub Pages needs to be enabled (one-time setup)

## Expected Live URL
https://xeonii.github.io/learnchinese/

## Required Setup (One Click)

GitHub Pages is currently **not enabled** for this repository. To enable it:

### Steps:

1. **Go to Repository Settings**
   - Visit: https://github.com/xeonii/learnchinese/settings/pages

2. **Configure Build and Deployment**
   - Under "Source", select: **GitHub Actions**
   - (Do NOT use "Deploy from a branch")

3. **Save**
   - Settings save automatically

4. **Merge this PR**
   - Once merged to `main`, the GitHub Action will automatically run
   - The site will be live at https://xeonii.github.io/learnchinese/ within 1-2 minutes

### Why GitHub Actions Source?

The workflow (`.github/workflows/deploy.yml`) uses the official `actions/deploy-pages@v4` action, which requires the "GitHub Actions" source to be selected. The older "Deploy from a branch" method won't work with this modern deployment approach.

## What Happens After Enabling

1. The workflow will run on every push to `main`
2. It builds the Vite app (`npm run build`)
3. Deploys the `dist/` folder to GitHub Pages
4. The site becomes available at https://xeonii.github.io/learnchinese/

## Testing Locally

Before the live site is available, test locally:

```bash
npm install
npm run build
npm run preview
# Visit http://localhost:4173/learnchinese/
```

The preview URL includes `/learnchinese/` to match the production GitHub Pages path.

## Troubleshooting

If the site shows a 404 after enabling:
1. Check that the workflow ran successfully: https://github.com/xeonii/learnchinese/actions
2. Verify "Source" is set to "GitHub Actions" (not "Deploy from a branch")
3. Re-run the workflow from the Actions tab if needed

---

**TL;DR**: Go to https://github.com/xeonii/learnchinese/settings/pages and set Source to "GitHub Actions", then merge this PR.
