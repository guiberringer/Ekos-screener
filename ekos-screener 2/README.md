# Ekos Sustainability Screener — deployment guide

A step-by-step guide to getting this live on Netlify, written for someone doing this
without a dev team.

## What you'll need first

1. **Node.js** installed on your computer (v18 or later). Get it from nodejs.org if
   you don't have it — it includes `npm`, which you'll use below.
2. **A GitHub account** (free) — the easiest way to deploy to Netlify is by connecting
   a GitHub repo, so Netlify can rebuild the site automatically whenever you push changes.
3. **An Anthropic API key** for Ekos. Sign up / log in at console.anthropic.com, create
   an API key there. This is billed directly to Ekos by Anthropic based on usage — the
   original project scope estimated $0.10–$0.50 per assessment, though this build now
   makes two calls per user (research + results), so real-world cost may run a bit
   higher until you've tested actual usage.

## 1. Get the project onto your computer

If this folder isn't already on your computer, unzip it somewhere sensible, then open
a terminal in that folder.

## 2. Install dependencies

```
npm install
```

## 3. Test it locally (optional but recommended)

To test the full thing locally — including the serverless function — you need the
Netlify CLI:

```
npm install -g netlify-cli
netlify dev
```

This will ask you to log in to Netlify (or create a free account) and will start a
local server. It won't have your API key yet — for local testing, create a file
called `.env` in this folder with:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

(This file is already excluded from Git via `.gitignore`, so it won't get committed
or pushed anywhere.)

## 4. Push it to GitHub

Create a new repository on GitHub, then from this folder:

```
git init
git add .
git commit -m "Initial screener prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

## 5. Deploy on Netlify

1. Go to app.netlify.com and log in (or sign up — free tier is fine for this).
2. Click **Add new site → Import an existing project**.
3. Choose **GitHub** and select the repository you just pushed.
4. Netlify should auto-detect the build settings from `netlify.toml`
   (build command `npm run build`, publish directory `dist`, functions in
   `netlify/functions`). Leave these as they are.
5. **Before the first deploy finishes being useful**, go to
   **Site settings → Environment variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your API key from console.anthropic.com — see step 0 below if you don't have one yet
   - Key: `GOOGLE_SCRIPT_URL` (see step 7 below)
   - Optional: `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX`
     (see step 8 below) — the app works fine without these, it just won't add
     completed submissions to your Mailchimp audience.
6. Trigger a deploy (or redeploy if it already ran without the keys set).

## 0. Getting an Anthropic API key without waiting on approval

You don't need Ekos's official Anthropic account to get a working demo live. Go to
console.anthropic.com, sign up with any email (a personal one is fine for now), verify
your phone number — new accounts get a small one-time free credit (no card needed for
that part), which is enough to demo this to stakeholders. When Ekos's own account is
approved later, generate a new key there and swap the single `ANTHROPIC_API_KEY` value
in Netlify — nothing else changes.

## 7. Set up Google Sheets (logs submissions + sends the results email)

This uses Google Apps Script, which runs entirely inside your Google account — no new
vendor, no API keys to manage, works with any Gmail or Google Workspace account.

1. Create a new Google Sheet (sheets.google.com) — call it something like
   "Ekos Screener Submissions".
2. Go to **Extensions → Apps Script**. Delete whatever's in the editor, and paste in
   the contents of `google-apps-script/Code.gs` from this project.
3. Restrict the permissions it will ask for (recommended): click the gear icon
   (**Project Settings**) on the left, tick **"Show 'appsscript.json' manifest file
   in editor"**. Go back to the editor (the `<>` icon), open the new `appsscript.json`
   file that appeared, delete its contents, and paste in the contents of
   `google-apps-script/appsscript.json` from this project instead. This limits what
   Google asks you to approve to just "this one spreadsheet" and "send email" —
   not full Gmail access or access to every sheet in your account.
4. Click **Deploy → New deployment**. For "Select type," choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   (This last setting sounds looser than it is — the URL is long and unguessable,
   and it only accepts POST requests shaped like the ones this app sends. It does
   *not* make your sheet publicly viewable.)
5. Click **Deploy**. The first time, Google will ask you to authorize the script.
   With the manifest in place, the permissions listed should now read something like
   "See, edit, create, and delete a specific Google Sheet" and "Send email as you" —
   noticeably narrower than the defaults. Approve it.
6. Copy the **Web app URL** it gives you.
7. Put that URL into Netlify as `GOOGLE_SCRIPT_URL`.

That's it — no separate email service needed. Emails will come from whichever Google
account you used to create the script, so for anything beyond an internal demo, use
an account with an address you're comfortable clients seeing (or switch this to a
proper transactional email service later — worth doing before high-volume real use,
since Gmail sending has daily limits and isn't built for production-scale automated
email).

## 8. Set up Mailchimp (optional — adds completed submissions to your audience)

1. In Mailchimp, go to **Account → Extras → API keys** and generate a new key.
   The server prefix (e.g. `us21`) is the part right after `https://` and before
   `.api.mailchimp.com` in your Mailchimp account URL — or check the end of the API
   key itself, after the last dash.
2. Find your **Audience ID**: Audience → Settings → Audience name and defaults →
   "Audience ID".
3. In your Mailchimp audience's merge fields, make sure `FNAME` and a custom field
   called `BIZNAME` (Business Name) exist — add `BIZNAME` under Audience →
   Settings → Audience fields and *merge* tags if it's not already there.
4. Add three environment variables in Netlify: `MAILCHIMP_API_KEY`,
   `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX`.

If any of these three are missing, the app still works — it just skips the
Mailchimp step silently and relies on Power Automate for the email and logging.

Once that's done, Netlify gives you a live URL (something like
`random-name-1234.netlify.app`) — you can rename this or attach a real domain
later in Site settings → Domain management.

## 6. Test the live version

Open the live URL, run through the screener with a real business name, and check
that research completes. If something goes wrong, the in-app "Show what the AI
actually found (debug)" panel will show you the raw API response — very useful
for diagnosing issues, but worth removing before this goes in front of real users
(see "Before this is public-facing" below).

## Before this is public-facing

This is still a working prototype, not a finished product. Before sending it to
real prospective clients, worth addressing:

- **Remove or hide the debug panel** in `src/App.jsx` (search for `debug-block`) —
  it's useful for us right now, not something a real visitor should see.
- **No data is actually saved anywhere yet.** Contact details, answers, and results
  all live only in the browser tab and disappear on refresh. Nothing is emailed,
  and nothing reaches an Ekos consultant. That's the next real piece of work.
- **Review the question set and AI prompts** with your consultants before this
  represents Ekos publicly — the current questions are a first draft.
- **Rate limits / cost monitoring** — keep an eye on your Anthropic console usage
  once this is live, especially early on, since nothing currently caps how many
  times someone can run the research step.

## Project structure

```
├── src/
│   ├── App.jsx        # the whole screener — UI, scoring logic, AI prompts
│   └── main.jsx        # mounts the app
├── netlify/functions/
│   ├── anthropic.js         # the ONLY place the Anthropic API key is used — runs server-side
│   └── save-submission.js   # forwards completed submissions to Google Sheets + Mailchimp
├── google-apps-script/
│   └── Code.gs          # paste this into script.google.com — logs rows + sends email
├── index.html
├── package.json
├── vite.config.js
└── netlify.toml         # tells Netlify how to build and where functions live
```
