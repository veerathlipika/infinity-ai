# Infinity AI — Personal AI Chat Assistant

A responsive, polished frontend for a personal AI chat assistant. It currently connects directly to Google Gemini using an API key you supply.

## Files
- `index.html` — app layout and connection settings
- `styles.css` — responsive dark, violet-accented UI
- `app.js` — chat, image upload, and Gemini API calls

## Run locally in VS Code
1. Put all four files (`index.html`, `styles.css`, `app.js`, `README.md`) in the same folder.
2. Open that folder in VS Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` → **Open with Live Server**.
5. Click **Connect Gemini** (top right) or the settings gear.
6. Create a key at https://aistudio.google.com/app/apikey, paste it into settings, select a model available to your key, and save.
7. Send a message or use `+` to attach an image.

You do not need Node.js for this local frontend demo.

## Important: "unlimited" does not mean literally unlimited
This app gives you your own chat interface, but it does **not** remove Gemini's model quotas, rate limits, availability restrictions, or potential costs. Usage depends on the model, your Google AI Studio/API account, and Google's current terms and limits. If a quota is reached, wait for it to reset or review your provider usage settings.

## Security warning
This is a frontend-only demo. The API key is stored in browser `localStorage` and sent directly from your browser to Google. Anyone with access to your browser profile/devtools may be able to retrieve it. Do not deploy this exact version as a public app or commit a real API key to GitHub.

For a public or multi-user version, add a backend (for example, Node.js + Express) and store the provider key in a server-side environment variable. Add authentication, rate limiting, per-user usage controls, and appropriate privacy protections. A backend can protect your key, but it still cannot bypass the AI provider's quotas or costs.

## Current limitations
- Chat history exists only in memory for the current page session; refreshing resets the conversation.
- Image upload is limited to 12 MB in this UI.
- Text responses are displayed as plain text, not full Markdown-rendered formatting.
- The app uses Google's Gemini `generateContent` API.

## Official reference
- Gemini API: https://ai.google.dev/api
- Google AI Studio API keys: https://aistudio.google.com/app/apikey
