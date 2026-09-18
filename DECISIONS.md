# Decisions

Judgement calls made while building, and the evidence behind them. Every one is
reversible; each says how.

Source material lives in [`reference/`](reference/): the prototype, the screen
copy (1 Sept 2026), the course-finder logic spreadsheet, and the GA4 tracking
plan.

## Client feedback round, 9 Sept 2026

From `LCBT Quiz Feedback.pdf`. Applied except where noted.

- **Landing headline** is now "FIND YOUR **DREAM** COURSE", DREAM in pink, and
  the CTA is larger and capitalised.
- **Type weights**: Gotham 700 for headings, 400 for body. Gotham ships
  400/500/700/900, so the old 600 and 800 were silently rounding up — 800 was
  rendering the headline in Ultra. Those are gone; only 400 and 700 are used.
- **Age question** is "How old will you be when you start the course?", and the
  funding-info subtitle is removed.
- **Calculating** no longer names the interest — just "Calculating your
  matches...".
- **Percentages are gone.** A "96% match" implied a calculation precise enough
  to justify the number and there wasn't one. Replaced with gold / silver /
  bronze medals for first, second and third. Nothing past third carries one
  rather than inventing a fourth tier. The labels — BEST MATCH, GREAT MATCH,
  ALSO WORTH A LOOK — are mine, and live in `copy.json`.
- **Share** now carries the client's line and shares **the quiz**, not the
  course page: the point is to get the next person to take it.
- **"Explore full details"** links to the matched course rather than the
  generic listing.
- **"See all courses" is no longer a card.** Removed from every deck — not just
  the backfill I had added, but the "Explore all Level 2 courses" and "see all"
  entries the spreadsheet itself put in decks, since the same objection
  applies. The route to browse everything now sits on the results panel and on
  the interest-fallback screen, so email capture still happens either way.
  `explore-l2` / `explore-l3` are kept but marked unavailable, because the
  client flagged this fallback design as unfinished.
- **"Discover All Courses"** pink CTA added to the interest-fallback screen,
  with the subtitle extended as asked.

**Smoosh assets, received 11 Sept.** `public/smoosh.png` is a single 9:16
composition, not a set of separate marks: an asterisk top right, a spiral off
the left edge, another asterisk bottom right, and a deliberately empty middle
column. So it goes in full-bleed rather than being placed mark by mark, and the
two circles are gone. It sits on `.app-shell::before` so it carries through
every screen, with `.screen` transparent over it.

Held at 16% opacity. At full strength the brush is the same pink as DREAM in
the headline and as the CTA, and it competes with both — `.landing__smoosh` in
`app.css` is the one number to change if the client wants it louder.

**The three emoji stickers are gone too.** Two of the three sat directly on the
new brush marks — the star on the top-right asterisk, the heart on the
bottom-right one. They were prototype stand-ins for brand decoration, and the
brand decoration has now arrived. Not something the feedback asked for, so if
they are wanted back it is a few lines in `Landing.tsx`.

## Deck feedback, 16 Sept

- **The first card says it, then shows it.** A translucent panel rises onto the
  card carrying "Swipe right if you're into it, left if you're not", holds for
  about a second, then lifts away — and the card nudges right to show the
  "YASSSS" stamp, returns, nudges left for "NOT FOR ME", returns. Once only.
  Cancelled the instant the person touches the card. Under
  `prefers-reduced-motion` the message still shows and the nudge does not: the
  words are information, the movement is decoration.

### A transition shorthand that killed every other transition

Worth recording, because the symptom was miles from the cause. `.card--revealing`
declared `transition: opacity 0.26s` — a *shorthand*, so it reset `transform`'s
transition to none. The top card always carried that class, so from the moment
it was added nothing on the deck eased any more: the gesture demo jumped, the
push-up settle jumped, and a released drag snapped back instead of springing.

Opacity now lives on the base `.card` rule and `.card--animating` lists all
three properties. Verified at runtime: `opacity` alone while a finger is down,
`transform, box-shadow, opacity` once released.
- **The next card is held out of focus after a like.** The hearts run for about
  a second; the next photograph used to be sharp underneath them, so the burst
  looked like it belonged to a card nobody had reached. The incoming card now
  stays blurred for 420ms and then focuses in, and the burst itself is shorter.
  Skipping is unaffected — no hearts, no pause.

  It was briefly done by hiding the card instead, which was worse and looked
  like a fault: a transparent card shows the card *behind* it, so a swipe read
  as "next card vanishes, a third one flashes up, then the real one returns".

  The settle waits with it. The card holds exactly where it already sat, at the
  same offset and the same blur, so nothing about it changes while the burst
  plays — then it rises into the top slot and comes into focus as one movement.
  Measured: still at y=8 and blur(5px) from 360ms to 720ms, resolving together
  by 990ms.

- **The coach panel animates on insertion, not on a state change.** It mounts
  already showing, so a transition had no previous state to run from and it
  simply appeared. Keyframes run when the element is inserted, which is what
  "popping in" needs.
- **The caption plate is tighter and lighter**, so more of the photograph
  shows: 0.72 to 0.62 opacity, type 25px to 22px. A soft text-shadow covers the
  lighter plate over a pale image.

  Most of the height turned out not to be padding at all. The caption is an
  `<h3>` and still carried the browser's default 1em heading margin — 44px of
  the original plate was margin nobody had written, which is why trimming
  padding kept seeming not to help. With `margin: 0` on it, the plate can keep
  roomy 20/22 padding and still come out a third shorter: 103px before, 70px
  now, about 12% of the card.
- **"Got your vibe."** no longer names the subject. "Leaning make-up" did not
  read as *a subject you might study*, and the sentence below already explains
  what happens next. This supersedes the "Loving all of it" variant.

- **A skip no longer waits.** Only a like fires the hearts, so only a like
  needs the pause — the skipped card now clears in 170ms rather than 300ms.
  Measured before changing it: opacity on the incoming card never dropped on a
  left swipe, so there was no hold, just a fly-out slower than it needed to be.

### The duplicated "Matched you"

The card behind sits 8px below the top one and `.deck` doesn't clip, so that
strip renders outside the deck showing the bottom of the next card's body —
which on a course card is the reason block, hence a second "Matched you".

The peek is wanted: it says there are more cards. So the card behind keeps its
exact previous geometry and only its **contents** are blurred (5px) — the rule
is `.card--behind > *`, not the card. Filtering the card itself softened its own
edge, shadow and corners; this leaves the card sitting where it always did and
only what is printed on it out of focus.

## Card photography

Re-cropped `makeup-occasion` from the client's original TIFF, 14 Sept: the
card was cut from the left of a landscape frame, so the subject sat small on
one side with white studio background filling the rest.

The new crop moves the window right — subject centred, the brush and hand
carrying across the frame, white reduced to a natural edge rather than half
the card. Framed so the face sits in the upper two-thirds, because the card's
caption plate covers the bottom third.

Exported at 720x960 rather than the 480x640 of the other six, which is roughly
2x the card's rendered size and noticeably crisper on a phone. Worth
re-exporting the rest from their originals so the deck matches.

## Course card artwork, 17 Sept

The client supplied seven 720x960 PNGs (a Dash collection, "Quiz end cards"),
one per live course. They replace the flat category colour and its icon in the
card head; the three cards with no artwork - register-interest and the two
"explore all" collections - still fall back to it, so the head keeps its
colour underneath as the loading state.

Each frame has the subject name printed into the top of the image at an angle.
That decides the crop: the head box is wider than the 3:4 source, so `cover`
has to discard part of it, and `object-position: top` is the only anchor that
keeps the badge. It holds when the head shrinks to 40% for the expanded state
too.

The burnt-in badge is also why the icon disc went rather than sitting on top
of the photo: the image already names the subject, louder than the icon did.

Converted to progressive JPEG at q86 - about 100 KB each against the PNGs'
900 KB, matching the vibe deck's existing budget. The medal pill needed a
short scrim under it, since it sits over whatever the photograph happens to be
at the bottom right; the scrim is scoped to photo heads, because over a flat
colour it just reads as a smudge.

## "Tap for details" never worked

Found while fitting the artwork. The card's own pointerup handler treats any
small-movement release as a tap and toggles the details panel. Tapping the
button therefore toggled twice - the deck opened it, the button's onClick
closed it - and the card sat there looking broken.

The `stopPropagation()` already on the button could never have helped:
pointerup has finished bubbling long before the click is dispatched.

The deck now ignores taps that land on a control (`button, a, input, select,
textarea, [role=button]`) and lets the element's own handler run. Tapping the
card anywhere else still toggles, which is how most people open it.

## A disclaimer that travels with the content

"*Requires a relevant Level 2 qualification" is keyed by level in `copy.json`
(`results.levelNotes`) rather than hardcoded to a Level 3 test. Adding Level 4
later is a line of JSON. The subject-specific wording stays in each course's
entry requirements - the note is the always-visible caveat, the requirement is
the detail behind it.

## "Which area was it in?", 17 Sept

The client spotted a question missing after the qualification one. It is real:
sheet 2 of the logic workbook, N10-N14, has it verbatim - Beauty Therapy /
Hairdressing / Hair & Media Make-Up / Another subject. It never got built
because it sits under an open note to themselves, "do we need to enhance qual
question?", and the main logic sheet never branches on the answer. It is not
in the screen content doc either.

The main sheet does admit the gap, twice: row 36 column F, "(until we know
which level 2 they hold)", and row 33 column F, "will then see pre reqs per
course".

What it was costing: every Level 3 recommendation was keyed off what somebody
swiped, never off the subject they hold. A Level 2 hairdresser who swiped
towards beauty was shown Level 3 Beauty Therapy as their best match, and its
entry requirement is a Level 2 Diploma in Beauty Therapy. The disclaimer added
earlier the same day was papering over exactly this.

The entry requirements now exist twice in `courses.json`: the prose the card
shows, and an `entry` block the matcher reads. Two copies of one fact is a
liability, but parsing "Level 2 qualification in Hair & Media Make-up or
Beauty Therapy" into a rule at runtime is a worse one, and the pair sit on
adjacent lines so a change to either is hard to miss.

### Why the subject test is narrow

It applies only to somebody whose highest qualification is a Level 2 - exactly
where the sheet's own note applies. Rows 69-72 offer a Level 3 holder a
sideways move into a different Level 3, and it is the Level 2 underneath that
admits them; testing those rows the same way would throw away recommendations
the college does make.

### Why filtering alone was not enough

Dropping ineligible courses can empty a row that had something in it. The
Level 2 hairdresser above is offered Level 3 Beauty Therapy and nothing else,
so filtering leaves them with an empty deck and a register-interest screen -
worse than the wrong recommendation, because Level 3 Hairdressing is right
there and they qualify for it.

So when eligibility empties a deck, the rule's own row for the subject they
hold is used instead. That changes what the "Matched you because" line has to
say: leading with "you're into beauty therapy" would explain a card that is no
longer in the deck. `MatchResult.basis` records which of the two chose the
deck, and the line follows it - "you already hold a Level 2 in hairdressing".

### Level 4

Guarded on the level as well: `l4-aesthetic` needs a Level 3 behind it, and
row 51 offers it to a Level 2 holder. That row is currently dormant, because
it only fires when short courses are switched on and they are not - so this
was a latent bug rather than a live one, and the guard is there for whenever
short courses come back.

### Not done

Sheet 2 N4-N8 also proposes merging "have you studied before?" and "what level
do you hold?" into one question - None / Level 2 / Level 3 / Not sure. That
would keep the quiz at four questions instead of five. It is a separate change
to the client's own copy and worth asking them about first.

## Slowing the card exit, 18 Sept

Client: "the cards are moving really fast, can we slow them down?"

Measuring it first was worth it, because the obvious reading was wrong. The
exit transition is 0.34s, but `--ease-out` is `cubic-bezier(0.2, 0.8, 0.2, 1)`,
which front-loads almost all the travel - and a card only has to cross its own
width (394px on the widest shell) to be gone, not the full 600px it animates
to. It cleared the screen in **64ms**. That is the whole of what anyone sees of
a swipe.

A first guess that the card was being cut off mid-flight was also wrong: it is
unmounted at FLY_MS (300ms) or FLY_MS_SKIP, both long after it has left.

The exit now has its own class rather than sharing `.card--animating` with the
settle and the drag spring-back, which should stay immediate -
`cubic-bezier(0.3, 0.5, 0.3, 1)` over 0.42s, closer to even, clearing the
screen at about 139ms.

That number is a constraint, not a preference: the card is removed from the DOM
once the fly timer elapses, so the exit has to finish before it. The skip timer
was 170ms, which left 31ms of headroom - too thin across devices - so it went
to 210ms. That is still the fly, not the hold the client objected to on skips;
`REVEAL_DELAY_MS` remains 0 in that direction.

`.card--flying` restates `box-shadow` because a `transition` shorthand would
otherwise reset it - the same trap that killed every transform transition
earlier in the project.

### Why the buttons still felt faster

Client, next day: still too fast on the heart and X buttons. Measuring by
starting position showed why - the duration was fixed at 0.42s however far the
card had to go, and a button press starts from dead centre, so it covers the
most ground in the same time:

| sent by | distance | speed |
| --- | --- | --- |
| button | 600px | 1429px/s |
| finger, just past threshold | 490px | 1167px/s |
| finger, dragged well across | 400px | 952px/s |

So the buttons were genuinely half again as fast as a drag, and no single
duration fixes that. The exit duration is now scaled to the distance left to
travel, which holds the speed constant however the card was sent.

The fly distance dropped from 600px to 480px at the same time: a card is gone
once it beats its own width (394px on the widest shell), and the rest was
animation nobody sees - it just made the numbers harder to reason about.
A full-distance exit is 520ms and clears the screen at about 240ms, against
139ms before. The skip promote timer moved 210ms -> 290ms to stay clear of it.

## No deck when there is nothing to match

19+ with no prior qualification goes straight from the loading screen to email
capture, carrying the register-interest card's own words, rather than swiping a
single card that isn't a course. Client request, 11 Sept.

Three things had to follow it:

- **`quiz_complete` moved out of the results screen** and into the loading
  screen's completion. Measuring completion on a screen this segment never sees
  would have quietly dropped them out of the funnel entirely.
- **Confirmation has its own variant.** There is no matched course, so there is
  no card to screenshot and no course page to link to — it confirms the
  registration and points at the full catalogue instead of inventing a match.
- **Back goes to the last question**, not to a deck that was never rendered, so
  someone who answered "no" by mistake can correct it.

The lead now carries `leadType: "registration" | "matches"` so the CRM can
route the two without inferring it from course ids.

## Swipe vs scroll on touch devices

Reported 11 Sept: cards could not be swiped on Android, though they were fine
in a desktop browser.

The card body is an `overflow-y: auto` scroll container. `.card` carried
`touch-action: none`, but the body had none of its own, so on a touchscreen the
browser claimed a drag starting inside it for scrolling and fired
`pointercancel` — which reset the card mid-swipe. A mouse never goes through
that arbitration, which is exactly why desktop looked fine.

Two halves to the fix:

- `touch-action: pan-y` on both the card and its body. `none` would have killed
  the scroll; leaving it unset let the browser steal the swipe.
- The deck now decides, on the first 8px of movement, whether a gesture is a
  swipe or a scroll. Horizontal gestures it claims (taking pointer capture only
  at that point, since capturing on touch-down suppresses scrolling); vertical
  ones it releases entirely. Vertical movement during a swipe is damped rather
  than followed, so the card stops chasing the finger downward.

## Where the live site overruled the spreadsheet

Checked against lcbt.co.uk on 7 Sept 2026, reading each course's own page.

**There are no separate "19+ Level 3" courses.** The sheet defines three, in
hidden rows 11-13. The live catalogue has one Level 3 diploma per subject, open
to both age groups at different prices, and the courses page says so plainly:
19+ learners apply for a Level 3 course studying 2 days a week. The 19+ rules
resolve to `l3-beauty` / `l3-hair` / `l3-mua`; the three 19+ records are gone.

**Short courses are not offered.** Absent from the catalogue, the nav, and site
search. `short-courses` is `"available": false`, which routes 19+ learners with
no prior qualification to the register-interest card — the sheet's own "short
courses do not exist" branch (rows 56-62). If they return, flip the flag.

Any course marked unavailable is filtered out wherever it appears, and a rule
left with nothing falls through to register-interest. A test walks every
reachable answer combination to prove none leaks.

**Funding is age-aware.** Courses that price differently carry `fundingByAge`
and the card shows the line for the age group in front of it. Showing a
30-year-old "Fully funded for 16-18" is the kind of error that costs someone
money, so a test asserts no 19+ learner ever sees a funded line.

**Two places LCBT's own wording varies.** Funding says "Fully funded for
eligible 16-18s" on some pages and "Fully funded for 16-18" on others — kept
verbatim per course, because "eligible" is doing real work. Duration says "2
days per week" on one page and "2 days a week" on five — normalised, since the
meaning is identical and mixed forms look careless across one deck.

**Start dates will go stale.** The year-long courses read September 2027, the
Level 4 reads September 2026. `startDate` is stored but not displayed. Another
argument for moving this content into WordPress.

## Prior qualifications

The Level 3 entry requirements are subject-specific — L3 Beauty Therapy needs a
Level 2 in Beauty Therapy — but the quiz only asks what *level* someone holds.
In principle it can offer a course they are not eligible for.

The spreadsheet answers this in its column F notes: **F33** *"will then see pre
reqs per course"*, and **F36** *"(until we know which level 2 they hold)"*,
explaining why the "I love it all" row offers all three Level 3 diplomas. The
intent is not to ask, but to offer a plausible set and show the requirements so
people can self-select. Two things implement it:

- **Entry requirements are a detail row**, listed first because they are the
  gate, and stacked rather than right-aligned because they are sentences. This
  is the one deliberate deviation from the screen copy, which specifies
  Duration and Funding only. The spreadsheet asked for it, and the spreadsheet
  is the document that reasoned about this problem.
- **Thin decks get a "see all" card.** Each rule names a `backfill` collection,
  appended below `minDeckSize`. Removing short courses had collapsed several
  19+ decks to a single card, removing exactly the choice this approach needs.

The `questions` tab does draft a "Which area was it in?" question, but under
*"do we need to enhance qual question?"* — an open query, not a decision — and
no table in the `logic` sheet is keyed on subject, so adopting it would mean
designing new matching rules rather than just adding a question.

**16-18 learners are asked about prior qualifications.** The screen copy gates
that question to 19+, but the sheet has a full 16-18 / Level 2 branch (rows
29-36) and the college's own site describes progressing from Level 2 to Level
3. Left gated, a 17-year-old who has just finished Level 2 Beauty is
recommended Level 2 Beauty again. To revert, restore
`"showWhen": { "age": "19+" }` on `priorQual` in `questions.json`.

## Vibe deck scoring

Scores are normalised to each category's share of what was on offer, not raw
points. The deck as supplied is 2 hair, 2 make-up, 3 beauty, so raw points let
beauty reach 6 where the others cap at 4 — and somebody who liked *every* card
came out "beauty" rather than "I love it all". Normalising asks "what
proportion of the hair cards did they like?", which is the question we mean,
and it stays correct if the mix changes.

This removes the bias without needing two more photographs. Balancing the deck
to 3/3/3 is still worth doing for its own sake; the scoring will not care.

## Analytics

Two deliberate departures from the tracking plan.

**`is_correct` is always `"n/a"`.** This is a matching quiz — no answer is
right or wrong — so filling that parameter would put meaningless data into an
"Answer Correct" dimension. It is still sent so the GTM setup in §4.2 works as
written, and a new **`answer_value`** carries the answer actually given. That
is the dimension worth registering.

**`question_number` is a fixed position, not a running count.** 1-7 are the
vibe cards, 8-11 the quick questions in `questions.json` order, 12 the interest
fallback. A counter breaks the per-question drop-off funnel the plan asks for:
using the back button inflates it, so "question 8" stops meaning the same
question between users.

Five events beyond the plan cover what happens after the results reveal, which
is where `quiz_complete` fires: `quiz_course_swipe`, `quiz_email_view`,
`quiz_email_submitted`, `quiz_share`, `quiz_restart`.

## Marketing consent

The email screen has an unticked opt-in checkbox, and `marketingConsent` rides
on the lead. The approved small print said the address would be used for
"course matches and relevant updates" — the matches are what the person asked
for, but updates are marketing, which under UK PECR generally needs its own
opt-in. The small print now says exactly that. **Worth confirming with whoever
owns compliance**, and with the CRM, which may expect its own consent field.

## CRM

<a id="crm"></a>Their stack is WordPress, feeding an "Umbraco CRM". Worth
knowing: there is no Umbraco CRM product — Umbraco is a .NET CMS, and the
family is CMS, Forms, Engage and Commerce. So this is most likely a custom lead
store built inside their Umbraco site, which means **the endpoint may not exist
yet and someone has to write it**, rather than being a URL to point at.

**Recommended shape: app → WordPress → Umbraco.** The content is moving to
WordPress anyway; hosting the app on that domain makes the call same-origin, so
no CORS to negotiate; any Umbraco key stays server-side rather than being
readable in the browser bundle; and if Umbraco is down, WordPress still
captured the lead and can retry. Posting straight to Umbraco is fine if their
team will expose a public endpoint with CORS and no secret key.

**To ask for:** which system it actually is and whether a submission endpoint
exists; which system emails the learner; the endpoint URL and whether it takes
browser requests; auth and which header it goes in; the field names it expects;
and whether it requires a consent flag.

## Smaller calls

- **The question count can grow mid-quiz** — answering "19+" turns "Question 1
  of 2" into "Question 2 of 3". Left as is. The alternative is showing a
  maximum most people never reach, which is its own small lie.
- **"Explore all Level 2/3 courses"** covers the sheet's "see all" cells, as
  `kind: "collection"` entries. They link to the general courses page and carry
  no match percentage, being a route onwards rather than a match.
- **The phone bezel is gone.** It was presentation chrome in the prototype, not
  part of the product surface.
- **Gotham is self-hosted.** The prototype asserted LCBT used it, with nothing
  behind the claim; checked against lcbt.co.uk on 7 Sept 2026 and confirmed —
  body and headings both compute to `Gotham, sans-serif`. The four weights
  their WordPress theme serves are now in `public/fonts/`, declared in
  `fonts.css` with `font-display: swap`, and Ultra and Bold are preloaded since
  they carry the headline and every heading. There is no 600 or 800 face, so
  the browser rounds up: 600 renders in Bold, 800 in Ultra, which is what the
  landing headline wants. The Google Fonts request is gone — Poppins stays in
  the CSS stack as a named fallback but would never render. **The licence is
  the open question:** Hoefler webfont licences are usually domain-scoped, so
  it needs checking against wherever this is hosted.
