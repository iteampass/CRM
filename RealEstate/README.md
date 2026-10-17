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

## Web rental search

Discover now shows web search instead of the deferred Reddit/X interface. Enter one
city, town or region and up to five keyword phrases (one per line). Each phrase runs
as a separate location-scoped Brave web search. Results are merged by canonical URL
(tracking parameters removed), with website filtering, sorting and pagination.
A page requests up to 20 results per phrase; up to ten pages are supported. Different
URLs for the same apartment are not automatically merged. Results may include
category pages and expired listings; prices, availability and coordinates are not inferred.

Set `BRAVE_SEARCH_API_KEY` in the server environment and restart the app. Obtain a key
from https://api-dashboard.search.brave.com/ with a plan supporting Web Search.
Never use a `VITE_` prefix. The key stays server-side. Without it, the UI explains the
missing connection and provides Google, Bing and Brave search links. External search
pages do not automatically import results into the list.

Automatic search requires sign-in and uses the existing 15-second user throttle.
Searches are bounded, run only on demand, preserve partial results on failure, and
have 10-second per-request timeouts. Results remain in component memory for the visit;
no database migrations or provider subscriptions are created by this change.

## AI apartment imports

Each web result now has **Extract with AI**. The **Imported apartments** menu contains
private, persistent records with location, street, address, floor, price (amount,
currency, period and original text), building/house type, parking, agency/owner,
advertiser name, announcement date, descriptions, source photo URLs, extraction notes,
and raw data. Unknown fields stay null. Announcement dates retain source wording and
are separate from import timestamps. Search results are not treated as verified facts.

Configure `OPENAI_API_KEY` on the server. Optional `RENTAL_EXTRACTION_MODEL` overrides
`gpt-4o-mini` with another Responses API model supporting strict structured outputs.
Never prefix secrets with `VITE_`. The public source URL is read through
[Jina Reader](https://jina.ai/reader/); `JINA_API_KEY` is optional for increased reader
limits. Retrieved text is sent to [OpenAI structured extraction](https://developers.openai.com/api/docs/guides/structured-outputs)
with `store: false`. These providers' account, billing and data-processing terms apply.

No arbitrary source hosts are fetched from the application server: it only calls the
fixed reader and OpenAI endpoints. No login cookies are forwarded. Reader requests
respect robots rules. Source failures and AI refusals are saved as failed records with
available raw metadata; retry from the detail view. Missing AI configuration is shown
before external calls. Category/group pages are saved as needing review with individual
listing links when found; extract those links separately. This avoids mixing multiple
apartments into a single record. Repeated successful imports reuse the user's record.

Raw data contains the search snippet, full retrieved reader response (Markdown, not
original HTML), retrieval time, model response and truncation flag. Provider responses
are capped at 1 MB, AI input at 60,000 characters, and request timeouts at 30/60 seconds.
Photos are source URLs stored in the database and shown in a gallery; image binaries
are not copied to Storage, so source removal can make a photo unavailable. The table
has pagination (50 records per page), current-page filters and on-demand raw-data loading.

The shared migration `20261017121212_imported_rentals.sql` creates
`realestate.imported_rentals` with per-user RLS, no anonymous access and a unique user/source
key. The server uses the user's verified session, not a service role. Run
`supabase/tests/imported_rentals.sql` as postgres for rollback-only ownership tests.
