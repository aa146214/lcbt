# LCBT Course Match

A mobile web app that matches someone to an LCBT course through a short,
Tinder-style swipe quiz.

```bash
npm install
npm run dev
```

| Command | |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Production build into `dist/` — a static bundle, hosts anywhere |
| `npm run preview` | Serve the production build |
| `npm test` | Matching-logic tests |
| `npm run lint` | oxlint |

Mobile only, as agreed: it fills the viewport on a phone and centres the same
column on anything wider.

## Configuration

Copy `.env.example` to `.env`. Everything is optional — with nothing set the
app runs end to end, storing leads in `localStorage` and loading no tracking.

| Variable | |
| --- | --- |
| `VITE_LEAD_ENDPOINT` | Where captured leads are POSTed. Unset → `localStorage`. |
| `VITE_GTM_ID` | GTM container, e.g. `GTM-XXXXXXX`. Unset → no tracking script loads. |
| `VITE_SITE_URL` | Public origin, for the absolute share-image URL. On Vercel this resolves itself from the project's production domain. |
| `VITE_ANALYTICS_DEBUG` | `true` logs every analytics payload to the console. |

## Where things live

```
src/
  content/     Courses, questions, swipe cards, copy, matching rules
  lib/         Matching, analytics, lead submission, the swipe-deck hook
  screens/     One file per screen in the flow
  components/  Cards, tiles, top bar, heart burst
  styles/      tokens.css + app.css
public/cards/  The seven vibe-card photographs
reference/     The prototype and the three source documents
```

Nothing user-facing is hard-coded in a component. To change what the app says
or offers, edit the JSON in `src/content/`:

- **A course** — `courses.json`, then reference its id from `matching.json`.
- **Swipe cards** — `vibeCards` in `questions.json`. Photo goes in
  `public/cards/`; `weights` decides which interest a right-swipe counts
  towards. An uneven mix is fine — scoring normalises for it.
- **A question or its options** — `questions` in `questions.json`. `showWhen`
  gates it on earlier answers.
- **Wording** — `copy.json`. `{placeholders}` fill at runtime.

**Moving content to WordPress:** `src/content/index.ts` is the only file that
reads those JSON files. Swap its imports for a fetch against the WP REST API
and make the loader async — no screen touches the JSON directly. Keep the
shapes in `types.ts` as the contract.

## Matching

`src/lib/matching.ts` evaluates `matching.json` top to bottom and takes the
first rule that matches. Every rule cites the spreadsheet rows it came from,
and `matching.test.ts` asserts each branch against those same rows — so change
the JSON and the test together.

The catalogue is verified against lcbt.co.uk (7 Sept 2026) and every course
cites its `source`. Where the live site contradicted the spreadsheet, and the
other judgement calls made along the way, are in [DECISIONS.md](DECISIONS.md).

## Analytics

Implements the GA4 tracking plan: its four quiz events, plus five more covering
the stages after the results reveal. Set `VITE_GTM_ID` and the container loads
itself — there is no snippet to paste into `index.html`.

**Register these custom dimensions in GA4** once the events show up in
DebugView: `answer_value`, `question_number`, `course`, `age_range`, `quiz_id`.

Note `answer_value` rather than the plan's `is_correct`, and see
[DECISIONS.md](DECISIONS.md#analytics) for why.

## Lead capture

`src/lib/leads.ts` POSTs this to `VITE_LEAD_ENDPOINT`:

```json
{
  "email": "someone@example.com",
  "answers": { "interest": "hair", "age": "19+", "goal": "career",
               "priorQual": "yes", "level": "Level 2" },
  "savedCourseIds": ["l3-hair"],
  "matchedCourseIds": ["l3-hair", "explore-l3"],
  "marketingConsent": false,
  "submittedAt": "2026-09-07T10:20:47.313Z",
  "source": "course-match-web"
}
```

A 2xx means success; anything else keeps the person on the email screen with an
error rather than falsely confirming. `marketingConsent` is the opt-in
checkbox, kept separate from the matches they actually asked for.

**Nothing is emailed yet.** "Check your inbox!" only becomes true once an
endpoint exists and something behind it sends the mail.

## Outstanding

Everything here needs someone else — an asset, an account, or a third party.

1. **CRM endpoint** — URL, auth, field mapping, and which system emails the
   learner. What to ask for is in [DECISIONS.md](DECISIONS.md#crm).
2. **GTM container ID** → `VITE_GTM_ID`, then register the dimensions above.
3. **Confirm the Gotham licence covers the app's domain.** The four weights
   are now self-hosted from `public/fonts/`, taken from LCBT's own WordPress
   theme. Hoefler webfont licences are usually domain-scoped, so whoever holds
   it should check it extends to wherever this is hosted. Nothing to build —
   just paperwork.
4. **Hosting.** Currently on Vercel at
   https://lcbt-course-match.vercel.app as a demo. `dist/` is static, so it
   moves anywhere. Note the per-deployment URLs are behind Vercel's
   deployment protection and will show a login — share the alias above, not
   the `…-ks6f7j2w1-…` URL.

`public/og-image.png` is generated, not designed — correct palette, typeface
and copy, but a designer could do better with it.
