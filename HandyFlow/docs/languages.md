# Interface languages

HandyFlow supports English and Serbian Cyrillic (Српски). The language selector is available on public pages and in the workspace. The choice is saved per browser under `handyflow-language`; blocked storage falls back to an in-memory choice. The first render uses English for matching server/client hydration, then restores the saved language. The document language changes to `sr-Cyrl` for Serbian.

Use `useI18n()` and `t("English interface text")` for application-owned text. Add its Serbian equivalent to `src/lib/locales/sr.json`. English is the fallback when a key is missing. Never translate stored enum values, IDs, routes, input values, customer names, job descriptions, messages or testimonials. Currency stays USD; locale formatting is independent of currency conversion.

The catalog covers landing/pricing, authentication, workspace navigation, request/profile/contact dialogs, feedback, client-side messages and calendar controls. Provider-managed authentication email templates, application email bodies and arbitrary server/provider error messages are not localized by this browser preference. Existing historical activity/notification text is retained as stored. This change does not modify Supabase data or email settings.

Validation: translation/render tests, full test suite, TypeScript and Vercel build. Browser checks cover language switching, translated sign-in and restoring Serbian after reload. Additional languages can be added by extending Language, localeFor, the catalog selection and the selector options.
