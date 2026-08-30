# Archive

Code taken out of the live application but kept for reference. Nothing in here is
routable or compiled — files carry a `.bak` extension on purpose.

## `api-chatbot-route.ts.bak`

Was `app/api/chatbot/route.ts`. Removed 26 August 2026, approved by Michael.

A public POST endpoint with no authentication and no rate limiting that called the
paid Anthropic API on every request. Harmless while the site had no traffic, but a
scriptable way to run up the API bill once paid advertising points at the site.

Its only caller was `src/components/ui/chatbot.tsx`, which is mounted nowhere, so
removing the route changed no user-facing behaviour.

The replacement is the public question index, which returns Michael's own stored
answers rather than model-generated text and carries proper rate limiting.
