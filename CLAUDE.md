# API Key Safety Rules

1. Store API keys and other secrets (including Anthropic and TheMealDB credentials) only in the local `.env` file.
2. Keep `.env` listed in `.gitignore`; never commit it.
3. Use the API key only in server-side code. Never expose it in browser code, client bundles, or frontend requests.
4. The user enters the real key directly into `.env`. Never ask them to paste it into chat, and never read, print, or inspect `.env`.

Keep `.env` out of source control. Use a server-side environment loader to read secrets at runtime without displaying them; never expose them in browser code, client bundles, or frontend requests.
