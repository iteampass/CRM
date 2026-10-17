# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Reddit and X rental search

Discover → **Search Reddit and X** lets signed-in users search a city or neighborhood,
choose either source or both, and optionally restrict Reddit to a subreddit. It searches
English and Serbian rental terms (including Belgrade / Beograd / Београд aliases),
returns up to 25 posts per source, and links to the original posts. These are search
leads, not verified listings: no price, availability, or map coordinates are inferred.
Reddit searches the past month; X recent search covers the past seven days.

Configure these **server-side** environment variables in the RealEstate deployment
(or a gitignored `.env` for local development), then restart the app:

| Variable | Value |
| --- | --- |
| `REDDIT_CLIENT_ID` | Approved Reddit OAuth application client ID |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth client secret |
| `REDDIT_USER_AGENT` | Descriptive app identifier, e.g. `web:realestate:v1.0 (by /u/YOUR_USERNAME)` |
| `X_BEARER_TOKEN` | X developer app bearer token with recent-search access |

Never prefix these secrets with `VITE_` or put them in browser settings. Each source
can be configured independently. Reddit uses application-only OAuth client credentials;
X uses the v2 recent-search endpoint. Provider approval, access and billing requirements
must be satisfied in the respective developer accounts. See the official
[Reddit OAuth guide](https://github.com/reddit-archive/reddit/wiki/OAuth2),
[Reddit search reference](https://www.reddit.com/dev/api/#GET_search), and
[X recent-search guide](https://docs.x.com/x-api/posts/search/quickstart/recent-search).

The server validates the existing Supabase session, validates search inputs, applies
a 15-second per-user process-local throttle, and uses 12-second request timeouts.
For multiple server replicas, enforce a shared rate limit at the gateway as well.
Missing configuration, denied access, provider limits, and outages appear per source;
a failure on one source preserves results from the other. Searches run only on form
submission, without automatic retries, background polling, or database persistence.
No database migration is needed. Live verification requires configured provider accounts.
