# API Key Safety Rules

1. Store the Anthropic API key only in the local `.env` file.
2. Keep `.env` listed in `.gitignore`; never commit it.
3. Use the API key only in server-side code. Never expose it in browser code, client bundles, or frontend requests.
4. The user enters the real key directly into `.env`. Never ask them to paste it into chat, and never read, print, or inspect `.env`.

Keep `.env` out of source control. Use a server-side environment loader to read the key at runtime without displaying it.
