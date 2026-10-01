# Ask Support website coverage

The build indexes all 22 published pages into focused, source-linked passages. Coverage is generated at `dist/support-coverage.json`; the knowledge index is rebuilt with every website deployment. FAQ links from the previous chatbot are preserved.

Coverage includes Daily Brief, NexDo AI, Tasks, Calendar, Shopping Lists, Moments, Calorie Tracker, Pomodoro, Voice AI, Ask AI, getting started, Help, Contact, Features, About, use cases, how it works, why NexDo, Trust, Privacy and Terms. Unpublished pricing, scripts, navigation, decoration, and explicitly hidden content are excluded.

Answers use retrieved published text and validated citations. Page descriptions accompany passages so preview limitations remain available. Website examples are not customer records. The support widget cannot access accounts or perform app actions. Missing evidence remains an explicit limitation. Provider failures return published excerpts.

## Content issues found during the audit

- Help says the iPhone app is under App Store review, while product pages advertise an App Store download. Confirm current availability before updating the FAQ; the chatbot must acknowledge conflicting sources.
- The Calorie Tracker website describes a sample-data preview that does not save meals or schedule calls. Support must retain this qualification until the published page is updated to match a released feature.
- Contact lists `support@nextdoapp.com`, while other contact addresses use `nexdoapp.com`. The mailbox has not been verified; no replacement address was invented.

## Validation

Run `npm run build && npm test`. Tests check every published page and citation anchor, module and policy question retrieval, contact synonyms, preview qualifications, fallback behavior, and model source validation. Live AI answers require production verification after deployment.
