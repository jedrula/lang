# Research: how to learn and keep vocabulary and grammar in a self-study app

This note covers the evidence behind the app's design: a non-gamified English course for Polish speakers, with a user-chosen daily time, a placement test, short lessons, and spaced-repetition reviews. Every section has two parts: **What the evidence says**, then **What our app does**. Where the evidence is mixed, the section says so. The verified FSRS-6 formulas and default weights are in §1.

---

## 1. Spacing and the review schedule

### What the evidence says

- **Spacing beats massing, and the effect is large.** A meta-analysis of spaced vs massed retrieval found g = 0.74 (Latimier, Peyre & Ramus, 2021). Earlier reviews found the same direction (Cepeda et al., 2006; Kang, 2016). With flashcards, spacing beat cramming for about 90% of learners, even though learners *felt* cramming worked better (Kornell, 2009).
- **Expanding vs uniform intervals: no reliable difference.** The same meta-analysis found g = 0.034, which was not significant. Nakata (2015) found little difference between expanding and equal spacing for L2 words. What matters more is the *total* spacing. Expanding schedules may help when there are many tests, and they are what adaptive schedulers produce anyway.
- **The best gap depends on how long you need to remember (Cepeda et al., 2008).** About 1,350 learners took part, with final tests up to a year later. For a fixed retention interval, performance first rises with the gap, then slowly falls. The best gap was about **20–40% of the retention interval for a 1-week test**, falling to about **5–10% for a 1-year test**. Too long a gap costs less than too short a gap. For goals of months or years, a first gap of about 1 day, then gaps that grow, fits the "ridgeline."
- **Adaptive per-item scheduling beats fixed schedules.** FSRS (Free Spaced Repetition Scheduler) predicts recall better than SM-2 and Leitner on the open-spaced-repetition benchmark, which covers hundreds of millions of Anki reviews. It is the default in Anki since 23.10 and ships as `ts-fsrs` for TypeScript.

**FSRS-6 formulas (checked against the awesome-fsrs wiki and the `ts-fsrs` source):**

- Grades: G ∈ {1 Again, 2 Hard, 3 Good, 4 Easy}. t = days elapsed, S = stability (the interval in days at which R = 0.9), D = difficulty, clamped to [1, 10].
- Retrievability: `R(t,S) = (1 + factor · t/S)^(−w20)`, where `factor = 0.9^(−1/w20) − 1`, so R(S,S) = 0.9.
- Interval: `I = S/factor · (r^(−1/w20) − 1)`, rounded and clamped to [1, max]. At r = 0.9, I = S.
- Initial stability: `S0(G) = w[G−1]`.
- Initial difficulty: `D0(G) = w4 − e^(w5·(G−1)) + 1`.
- Difficulty update:
  - `ΔD = −w6·(G−3)`
  - `D' = D + ΔD·(10−D)/9` (linear damping)
  - `D'' = w7·D0(4) + (1−w7)·D'` (mean reversion toward the Easy initial difficulty)
- Stability after a successful review: `S' = S·(1 + e^w8 · (11−D) · S^(−w9) · (e^(w10·(1−R)) − 1) · [w15 if Hard] · [w16 if Easy])`.
- Stability after a lapse: `S'f = w11 · D^(−w12) · ((S+1)^w13 − 1) · e^(w14·(1−R))`. This is then capped at `S / e^(w17·w18)`, so a lapse never raises stability.
- Same-day (short-term) reviews: `S' = S · e^(w17·(G−3+w18)) · S^(−w19)`. For G ≥ 2 the multiplier is at least 1.

**FSRS-6 default weights (w0 to w20):**

```
0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542
```

**Older versions, for reference:**

- **FSRS-4.5:** fixed decay of −0.5 and factor of 19/81. It had 17 weights and no same-day term.
- **FSRS-5:** added w17 and w18 for same-day reviews, and introduced mean reversion toward D0(4).
- **FSRS-6:** added w19 (a same-day stability-saturation term) and w20 (a trainable decay).
- **Other `ts-fsrs` defaults:** `request_retention` = 0.9, `maximum_interval` = 36500, learning steps 1m and 10m, relearning step 10m.

**Desired retention.** The Anki manual says: "The default is 90%, which offers a good balance… Above 90% the workload increases very quickly, and above 97% the workload can be overwhelming." Its FSRS guidance is that all (re)learning steps should be **shorter than 1 day** and kept to a minimum. Steps of 1 day or more conflict with the model.

**What the defaults imply for the first review.** With the default weights at 0.9 retention, the first "real" interval after a new item is:

| First grade | Interval |
|---|---|
| Again | ~0.2 d (same day) |
| Hard | ~1 d |
| Good | ~2 d |
| Easy | ~8 d |

### What our app does

- **Scheduler:** use FSRS-6 through `ts-fsrs` with the default weights, `request_retention` = 0.90 (not user-editable in v1; maybe 0.85–0.93 later), fuzz on, and `maximum_interval` of about 365 days (language items get refreshed by use anyway). Once a user has about 1,000 reviews, optionally fit their personal weights with the FSRS optimizer.
- **Grade automatically, not by self-rating.**
  - Correct on the first try → Good.
  - Correct but slow, or after a hint or near-miss → Hard.
  - Wrong → Again.
  - Correct and fast on a recall-type exercise → Easy, but only for recall exercises.

  This removes the Anki "which button?" friction.
- **Same-day repetitions in a lesson are learning steps, not separate FSRS reviews.** Retrievals inside the lesson (see §2) bring the item to criterion. Then make a single FSRS "first review" using the grade from the item's final in-lesson attempt. If learning steps are used, `ts-fsrs` handles them through its short-term formula. Never schedule a learning step of 1 day or more.
- **First review delay:** the next day or two days later (FSRS's ~2 d for Good, 1 d for Hard), not the same day. If the item failed in the lesson, re-show it at the end of the same session.
- **Priority when reviews pile up:** do overdue items with the lowest R first, and never hide due reviews behind new content.

---

## 2. Retrieval practice and exercise sequencing

### What the evidence says

- **Testing beats restudying.** Repeated retrieval of Swahili–English pairs gave about 80% recall a week later, against about 35% when items were dropped from testing after one correct recall, even with continued study (Karpicke & Roediger, 2008). Roediger & Karpicke (2006) found the same for prose.
- **Harder successful retrievals help more.** This is the "desirable difficulties" idea (Bjork, 1994), and the retrieval-effort hypothesis (Pyc & Rawson, 2009). A longer gap or a harder format helps *if* retrieval still mostly succeeds.
- **Recall formats generally beat recognition for later recall.** Short-answer tests beat multiple choice when feedback is given (Kang, McDermott & Roediger, 2007). For L2 words, productive (L1→L2) practice builds productive knowledge, and receptive practice builds receptive knowledge (Webb, 2005, 2009). Multiple choice is easier and safer early on, and is still a retrieval.
- **Within-session repetition has diminishing returns.** Nakata (2017) compared 1, 3, 5 and 7 retrievals per session: more helped, with diminishing gains beyond about 5.
- **Successive relearning works.** Rawson & Dunlosky (2011, 2022) recommend retrieving to an initial criterion of about **3 correct recalls**, then **relearning in about 3 more spaced sessions**. The benefit of a higher initial criterion shrinks once spaced relearning sessions follow. So extra drilling in session 1 is worth less than coming back on later days.

### What our app does

- **Lesson flow per new item:** present the item with an example sentence, TTS audio, and a Polish gloss or note. Then run the "ladder" below. Interleave other new items between retrievals so each one comes back after a few other items.
  1. Recognition: multiple choice with 4 options, EN→PL meaning.
  2. Recognition from audio.
  3. Assembly or cloze from a word bank.
  4. Typed recall: PL→EN, or a cloze in a sentence.
- **Criterion:** 2 correct retrievals for easy items, 3 for difficult ones (D > 6 or a prior lapse). The *last* correct retrieval must be typed recall. Cap at about 5–6 attempts per item per session, then let spacing take over.
- **Format chosen by memory strength.** Use FSRS stability:
  - S < 3 d → mix in recognition or cloze.
  - S of 3–20 d → typed recall in a sentence.
  - S > 20 d → production: translate a short sentence, or a dictation from audio.

  After a lapse, drop one rung down the ladder.
- **Grammar** is scheduled as items too: one pattern = one card with many sentence instances, picked at random on each review so the learner can't just memorize one sentence.

---

## 3. Feedback

### What the evidence says

- **Feedback after errors matters most.** Without feedback, testing barely helps items that were answered wrongly. Showing the correct answer greatly improves later recall of those items (Pashler et al., 2005). Feedback also helps correct low-confidence answers (Butler, Karpicke & Roediger, 2008).
- **Delayed vs immediate feedback: mixed.** In the lab, slightly delayed feedback can match or beat immediate feedback (Butler et al., 2007; Metcalfe et al., 2009). In classroom and app settings, immediate feedback is usually as good and is simpler. Answer-only feedback ("the correct answer is X") does most of the work for vocabulary. An explanation helps more with grammar and concepts.
- **Errorful generation is fine if corrected.** Guessing wrongly and then being corrected does not hurt, and may help (Kornell, Hays & Bjork, 2009).

### What our app does

- **Immediate feedback after every answer.** Show the correct answer, play its audio, and for grammar give a one-line reason in Polish ("Present perfect — skutek teraz, brak określonego czasu w przeszłości"). After a wrong answer, the item comes back later in the same session (a 10-minute relearning step) and must be recalled correctly once.
- **Near-miss handling for typed answers.** Normalize case, extra spaces, curly apostrophes, and contractions (*don't* = *do not*). Then:
  - An edit distance of 1 for words of 5+ characters (or 2 for 9+), where the result is not *another valid word*, counts as a typo. Accept it, show a "watch the spelling" diff, and grade it Hard.
  - A wrong form of the correct lemma (*go/went/gone*, a missing article, singular/plural) is **not** a typo. Grade it Again and point out the specific feature, since that is often the very thing being learned.
  - Accept listed alternatives (UK/US spelling, synonyms the item allows).
- **Optional "I was right" override,** used sparingly, which changes the grade to Hard.

---

## 4. Vocabulary selection, context, load, and interleaving

### What the evidence says

- **Frequency comes first.**
  - The first ~1,000 word families cover about 80% of typical written text and more of speech.
  - The NGSL 1.2 (2,809 words, CC BY-SA) claims about 92% coverage of general English text. That figure comes from the authors.
  - Comfortable reading needs about 98% coverage, which takes ~8,000–9,000 families (Nation, 2006; Hu & Nation, 2000). Speech needs ~6,000–7,000 families. Adequate comprehension at 95% coverage takes ~4,000–5,000 (Laufer & Ravenhorst-Kalovski, 2010).
- **Context vs isolated: both, in sequence.** Deliberate learning with flashcards or word lists works well and fast (Nation; Webb, Yanagisawa & Uchihara, 2020 meta-analysis). Incidental learning from context is slow and needs many encounters, about 8–10 or more (Uchihara, Webb & Yanagisawa, 2019). Example sentences show collocation, grammar, and usage. A good compromise is an isolated meaning link plus a sentence.
- **Don't teach semantic sets together.** Learning near-synonyms or sets such as colours, days, or opposites together causes interference and slows learning (Tinkham, 1993; Waring, 1997; Nation, 2000). Thematic clusters ("going to the doctor") do not have this problem.
- **Interleaving** helps with telling similar categories apart (Kornell & Bjork, 2008). For grammar, mixing contrasting forms in review (past simple vs present perfect) trains the choice, not just the form. The evidence is weaker for language than for maths or categories.
- **Review load.** The Anki manual gives an example: 20 new cards/day → about 200 reviews/day at steady state. That is roughly **10 reviews per daily new card**. In the first weeks the ratio is lower. Typical times are about 8–15 s per review and about 45–90 s per new item, including its in-lesson retrievals.
- **Session length.** Distributed short sessions beat long ones, and there is no strong evidence for a precise optimum. 10–30 minutes per day, every day, is a sensible range.

### What our app does

- **Content order:** NGSL / CEFR-graded order (English Vocabulary Profile levels for A1–B2), with grammar from a CEFR grammar progression. Take the high-frequency lexical sets first, about 1,000 words for A1–A2 and about 2,500–3,000 by B1–B2. Multi-word items (*get up*, *look for*, *I'd like*) are cards too.
- **Every card has:** an English headword, audio, a Polish meaning, 3+ example sentences (one shown at a time), and a collocation note. Avoid introducing members of a semantic set in the same lesson; spread them across lessons.
- **New items per day come from the time budget:** `new_per_day ≈ 0.4 × daily_minutes`.
  - 10 min → 4, 15 min → 6, 20 min → 8, 30 min → 12.
  - Floor of 3, cap of 15–20.

  This comes from the steady-state estimate of 10N reviews × ~10 s + N × ~60 s ≈ 160 s per daily new item.
- **Dynamic throttle:**
  - If today's due reviews would fill more than 70% of the budget, cut new items by half.
  - If more than 100%, show no new items today. Say so plainly, without guilt.
  - Reviews always come first in a session. Then new lesson content.
- **Interleave reviews** across topics and item types, and schedule contrastive grammar pairs as mixed review sets.

---

## 5. Placement test (A1–B2, 20–30 items)

### What the evidence says

- **Computerized adaptive tests (CAT)** based on item response theory pick each item to match the current ability estimate. They reach the precision of a fixed test with about half the items. Well-targeted Rasch-based CATs typically reach a standard error of about 0.3 logits, a reliability of about 0.9, in 20–30 items — *if the item bank is calibrated*. DIALANG and the Oxford/Cambridge online placement tests work this way.
- **Without calibration data,** a multistage test (MST) with judged item difficulties is more robust than a full CAT.
- **Classification near a cut point is the weak spot.** Expect ±1 sub-level of error for borderline learners. Placement should therefore be *correctable*.

### What our app does

- **Bank:** about 15–20 items per level (A1, A2, B1, B2), tagged with skill:
  - vocabulary: meaning recognition plus a frequency-band check, i.e. "do you know this word" with pseudo-words to catch over-claiming
  - grammar: gap-fill and MC
  - a few listening items with TTS
- **Version 1 is a multistage test of about 24 items:**
  - Stage 1: 6 items at A2/B1 boundary difficulty.
  - Then route to an easier or harder 9-item stage, then a final 9-item stage.
  - Stop early if a learner gets 5 of the first 6 wrong (place at A1) or answers everything correctly through the B2 stage.
- **Scoring:** a Rasch (1PL) ability estimate with prior item difficulties set from CEFR level (A1 = −1.5, A2 = −0.5, B1 = 0.5, B2 = 1.5 logits). Log all responses so the items can be recalibrated once there are a few hundred test-takers. Then switch to a true CAT with the maximum-information rule, stopping at SE < 0.35 or 30 items.
- **Pseudo-words:** if a learner says "I know" to more than 1 of 5 pseudo-words, discount their self-reported vocabulary.
- **Placement output:** the starting unit, plus every item below that level marked "assumed known." Those items enter as low-priority cards that get a quick check during the first 2 weeks. A lapse demotes the item, and if many items lapse the learner is offered a lower start. The learner can always change level.

---

## 6. What Polish speakers find hard

### What the evidence says

These are contrastive and teacher-reported errors (Swan & Smith, *Learner English*; Gabryś-Barker on articles). The empirical base is mostly descriptive, but the list is consistent.

- **Articles:** Polish has none. Learners omit *a/the* and overuse *the* with generic or abstract nouns ("The life is hard"). This is the most persistent error, even at C1.
- **Tenses and aspect:**
  - Present perfect vs past simple ("I am here since 2010," "I have seen him yesterday").
  - Present continuous vs present simple.
  - Overuse of *will*.
  - No sequence-of-tenses habit in reported speech.
  - Polish verb aspect (perfective/imperfective) does not map onto English tenses.
- **Questions and negation:** do-support is missing ("You like it?", "Where you live?", "He don't…"). Word order in indirect questions ("Can you tell me where is the station?").
- **Prepositions:** *on/in/at* for time and place, *depend on*, *married to*, *interested in*. Polish case endings do the work that English prepositions do.
- **Countability:** *advices*, *informations*, *furnitures*, *much/many*.
- **Lexical pairs Polish expresses with one word:** *lend/borrow*, *make/do*, *say/tell*, *learn/teach* (Polish *uczyć (się)*), *remember/remind* (Polish *pamiętać/przypominać*).
- **False friends:**

  | Polish | Looks like | Actually means |
  |---|---|---|
  | aktualny | actual | current |
  | ewentualnie | eventually | possibly |
  | sympatyczny | sympathetic | nice |
  | konkurs | concourse | competition |
  | ordynarny | ordinary | vulgar |
  | lektura | lecture | set reading |
  | dress | — | Polish *dres* = tracksuit |
  | pupil | — | Polish *pupil* = favourite |
  | fabryka | fabric | factory |

- **Pronunciation:**
  - /θ ð/ come out as /f, t, d, s/.
  - /w/ vs /v/.
  - The vowel pairs /ɪ–iː/, /æ–e/, /ʌ/, and schwa / weak forms.
  - Final devoicing ("bed" → "bet"), which is a Polish rule carried over.
  - Word stress (Polish stresses the penultimate syllable).
  - The *-ed* and *-s* endings.

### What our app does

- **A "Polish trap" note** (in Polish) on each relevant item and grammar card, plus contrastive minimal-pair drills:
  - present perfect vs past simple with time markers (*since/for/yesterday/ever/ago*)
  - a/the/∅ gap-fills
  - do-support question building by ordering words
  - indirect-question word order
- **Article and do-support errors get specific feedback.** They are never accepted as typos (§3).
- **False friends** are cards that show the trap explicitly. The Polish word and the misleading English look-alike appear side by side.
- **Listening discrimination items** for minimal pairs (*think/sink/fink*, *west/vest*, *ship/sheep*, *bed/bet*), using TTS.

---

## 7. Audio, speaking, and motivation without gamification

### What the evidence says

- **Phonological form is part of knowing a word** (Nation's "form" dimension). Learning a word only from writing leaves the learner weak on spoken recognition. Hearing the word while learning it helps link form and meaning. Listening is the skill Polish learners most often name as weak.
- **Speaking practice evidence is thinner.** Producing aloud helps memory (the "production effect": MacLeod et al., 2010). Automatic pronunciation scoring from browser speech recognition is unreliable for non-native speech. Treat it as optional.
- **Motivation.** Self-determination theory and goal-setting research favour a sense of competence, autonomy, and specific, attainable goals. Extrinsic reward mechanics (points, leaderboards, streak loss) can crowd out intrinsic motivation and push people toward easy, low-value activity. Streak-loss anxiety is a known side effect. Evidence specific to language apps is limited, and mostly comes from industry.

### What our app does

- **Audio everywhere:** every card and example sentence can be played with browser TTS (en-GB or en-US voice; set the rate to 0.9 for new items). A share of exercises (about 20–30%) are audio-first: listen → choose the meaning, or listen → type (dictation).
- **Speaking:** an optional "say it aloud" prompt on production steps (production effect). Optional `SpeechRecognition` check where available, with lenient matching. It never blocks progress or affects the FSRS grade in v1.
- **Motivation:**
  - A daily time target the learner chose, and a calm "done for today" screen.
  - Concrete progress shown as "words you can recall: 1,240 · grammar points: 38 · estimated level: A2+ → B1 in ~6 weeks at this pace."
  - A projected review forecast for the coming days.
  - No streaks, points, hearts, or leaderboards.
  - A missed day only shows more reviews due, with a "catch up gently" option that spreads the backlog over 3–5 days at the lowest R first.

---

## References

- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In *Metacognition*. MIT Press. — https://bjorklab.psych.ucla.edu/research/
- Butler, A. C., Karpicke, J. D., & Roediger, H. L. (2008). Correcting a metacognitive error: Feedback increases retention of low-confidence correct responses. *JEP:LMC*, 34(4). — https://doi.org/10.1037/0278-7393.34.4.918
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin*, 132(3). — https://doi.org/10.1037/0033-2909.132.3.354
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102. — https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf
- Council of Europe. CEFR Companion Volume (2020). — https://www.coe.int/en/web/common-european-framework-reference-languages
- FSRS algorithm wiki (FSRS-4.5/5/6 formulas and defaults). — https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
- ts-fsrs (TypeScript implementation; defaults in `constant.ts`, formulas in `algorithm.ts`). — https://github.com/open-spaced-repetition/ts-fsrs
- SRS benchmark (FSRS vs SM-2, etc.). — https://github.com/open-spaced-repetition/srs-benchmark
- Anki Manual, Deck Options (FSRS, desired retention, learning steps, workload). — https://docs.ankiweb.net/deck-options.html
- Hu, M., & Nation, I. S. P. (2000). Unknown vocabulary density and reading comprehension. *Reading in a Foreign Language*, 13(1).
- Kang, S. H. K. (2016). Spaced repetition promotes efficient and effective learning. *Policy Insights from the Behavioral and Brain Sciences*, 3(1). — https://doi.org/10.1177/2372732215624708
- Kang, S. H. K., McDermott, K. B., & Roediger, H. L. (2007). Test format and corrective feedback modify the effect of testing on long-term retention. *European Journal of Cognitive Psychology*, 19. — https://doi.org/10.1080/09541440601056620
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science*, 319, 966–968. — https://doi.org/10.1126/science.1152408
- Kornell, N. (2009). Optimising learning using flashcards: Spacing is more effective than cramming. *Applied Cognitive Psychology*, 23. — https://doi.org/10.1002/acp.1537
- Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of induction"? *Psychological Science*, 19(6). — https://doi.org/10.1111/j.1467-9280.2008.02127.x
- Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. *JEP:LMC*, 35(4). — https://doi.org/10.1037/a0015729
- Latimier, A., Peyre, H., & Ramus, F. (2021). A meta-analytic review of the benefit of spacing out retrieval practice episodes on retention. *Educational Psychology Review*, 33. — https://doi.org/10.1007/s10648-020-09572-8
- Laufer, B., & Ravenhorst-Kalovski, G. C. (2010). Lexical threshold revisited. *Reading in a Foreign Language*, 22(1).
- MacLeod, C. M., et al. (2010). The production effect: Delineation of a phenomenon. *JEP:LMC*, 36(3). — https://doi.org/10.1037/a0018785
- Metcalfe, J., Kornell, N., & Finn, B. (2009). Delayed versus immediate feedback in children's and adults' vocabulary learning. *Memory & Cognition*, 37. — https://doi.org/10.3758/MC.37.8.1077
- Nakata, T. (2015). Effects of expanding and equal spacing on second language vocabulary learning. *SSLA*, 37(4). — https://doi.org/10.1017/S0272263114000825
- Nakata, T. (2017). Does repeated practice make perfect? The effects of within-session repeated retrieval on second language vocabulary learning. *SSLA*, 39(4), 653–679. — https://doi.org/10.1017/S0272263116000280
- Nation, I. S. P. (2000). Learning vocabulary in lexical sets: Dangers and guidelines. *TESOL Journal*, 9(2).
- Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *Canadian Modern Language Review*, 63(1). — https://doi.org/10.3138/cmlr.63.1.59
- Nation, I. S. P. (2013). *Learning Vocabulary in Another Language* (2nd ed.). Cambridge University Press.
- New General Service List 1.2 (Browne, Culligan & Phillips). — https://www.newgeneralservicelist.com/new-general-service-list
- Pashler, H., Cepeda, N. J., Wixted, J. T., & Rohrer, D. (2005). When does feedback facilitate learning of words? *JEP:LMC*, 31(1). — https://doi.org/10.1037/0278-7393.31.1.3
- Pyc, M. A., & Rawson, K. A. (2009). Testing the retrieval effort hypothesis. *Journal of Memory and Language*, 60(4). — https://doi.org/10.1016/j.jml.2009.01.004
- Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and efficient learning: How much is enough? *JEP:General*, 140(3). — https://doi.org/10.1037/a0023956
- Rawson, K. A., & Dunlosky, J. (2022). Successive relearning: An underexplored but potent technique for obtaining and maintaining knowledge. *Current Directions in Psychological Science*. — https://doi.org/10.1177/09637214221100484
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3). — https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Swan, M., & Smith, B. (Eds.) (2001). *Learner English* (2nd ed.). Cambridge University Press.
- Tinkham, T. (1993). The effect of semantic clustering on the learning of second language vocabulary. *System*, 21(3).
- Uchihara, T., Webb, S., & Yanagisawa, A. (2019). The effects of repetition on incidental vocabulary learning: A meta-analysis. *Language Learning*, 69(3). — https://doi.org/10.1111/lang.12343
- Waring, R. (1997). The negative effects of learning words in semantic sets. *System*, 25(2).
- Webb, S. (2005). Receptive and productive vocabulary learning. *SSLA*, 27(1). — https://doi.org/10.1017/S0272263105050023
- Webb, S., Yanagisawa, A., & Uchihara, T. (2020). How effective are intentional vocabulary-learning activities? A meta-analysis. *Modern Language Journal*, 104(4). — https://doi.org/10.1111/modl.12671
- English Vocabulary Profile (CEFR-levelled vocabulary). — https://www.englishprofile.org/wordlists
