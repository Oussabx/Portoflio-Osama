# Osama — Portfolio

Everything runs on your computer. Nothing to install, no accounts.

## View your site
Double-click **`index.html`**.

## Edit your site
1. Double-click **`admin.html`**. Chrome or Edge works best.
2. Change your projects, profile, about, skills and contact info.
3. Click **Save changes** (or press Ctrl+S).
   - **Chrome / Edge:** the first time, a save window opens. Go to this folder's **`content`** folder, pick **`data.js`** and replace it. After that, Save writes to it directly until you close the tab.
   - **Other browsers:** a `data.js` file downloads. Move it into the **`content`** folder and replace the old one.
4. Refresh `index.html` to see your changes.

Edits are also kept as a draft in the browser, so closing the tab by accident won't lose them.

## Files
```
index.html        the site
admin.html        the editor
content/data.js   all your content (text, projects, uploaded images)
assets/           logo, icons, example project images
```

## Contact messages
The contact form opens the visitor's email app, addressed to your email. To collect messages instead, paste a free
[Formspree](https://formspree.io) form link in admin → Contact & messages.

## Putting it online later
Upload this folder's contents to any static host (Netlify Drop, GitHub Pages, Vercel). `index.html` must be at the top level.
