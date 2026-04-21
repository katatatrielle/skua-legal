# Spellbook Competitive Eval

Use this document to run a controlled side-by-side evaluation of Skua against Spellbook on fake but realistic contracts.

The goal is not to prove Skua is better at everything. The goal is to find whether Skua wins on the narrow workflow that matters for solos:

- review in Word
- ask a cited question
- revise a clause into usable fallback language
- apply output quickly
- remember preferred language
- keep cost predictable

## Scope Rules

Run this eval only on the 3 supported contract families:

- NDA / confidentiality agreement
- Services agreement / MSA / consulting agreement
- SaaS / software subscription agreement

Do not score broad legal research, multi-document diligence, or generic drafting breadth. Those are outside the v1 wedge.

## Eval Structure

For each document, run the same 4 jobs in both products:

1. Review the document.
2. Ask 3 cited questions.
3. Revise 2 weak clauses.
4. Apply at least 1 output in Word if the product supports it.

Use the same operator, same machine, same internet conditions, and same fake contracts for both tools.

## Test Set

Start with 12 fake documents.

- 4 NDA documents
- 4 services agreements
- 4 SaaS agreements

For each contract family:

- 1 clean / mostly acceptable draft
- 2 realistic counterparty drafts with 5-10 known issues
- 1 deliberately adversarial draft with obvious traps

Use the current samples in `docs/pilot/samples` as seeds, then expand them into longer variants before the eval.

## Answer Key

Create an answer key before touching either product.

For each document, write:

- document ID
- contract type
- must-catch issue list
- expected answer for each ask question
- expected support clause or quote
- preferred fallback language for each revise test

The answer key is the reference. Do not change it after seeing product output.

## Review Rubric

Score each document review on a 100-point scale.

| Category | Weight | Scoring rule |
| --- | ---: | --- |
| Must-catch recall | 35 | Percent of answer-key issues found |
| False-positive control | 15 | Fewer weak or noisy findings scores higher |
| Citation correctness | 20 | Findings point to the right clause or quote |
| Actionability | 15 | Comment/redline output is immediately usable |
| Ranking quality | 10 | The highest-value issues appear near the top |
| Time to first useful output | 5 | Faster path to the first good finding |

### Review Scoring Notes

- A finding only counts as correct if it identifies the issue and points to the right source.
- A finding with vague or wrong support counts against citation correctness.
- A technically correct but non-usable draft comment or redline should lose actionability points.

## Ask Rubric

Ask 3 fixed questions per document.

- 1 straightforward factual question
- 1 clause-interpretation question
- 1 unsupported question that should be refused or bounded

Score Ask on a 50-point scale.

| Category | Weight | Scoring rule |
| --- | ---: | --- |
| Answer correctness | 20 | Matches the answer key |
| Citation quality | 15 | Cites the right support |
| Refusal quality | 10 | Unsupported question is handled safely |
| Brevity and clarity | 5 | Answer is concise and readable |

## Revise Rubric

Run 2 clause rewrites per document.

- 1 commercially important clause
- 1 lower-stakes but realistic cleanup clause

Score Revise on a 50-point scale.

| Category | Weight | Scoring rule |
| --- | ---: | --- |
| Legal usefulness | 20 | Draft improves the clause meaningfully |
| Alignment with preferred fallback | 10 | Close to the answer-key fallback language |
| Grounding / rationale quality | 10 | Clear rationale or support for the change |
| Ease of application | 5 | Easy to insert or replace in workflow |
| Labeling / trustworthiness | 5 | Clearly framed as draft language where appropriate |

## Workflow Rubric

Score the real workflow separately from output quality.

| Category | Weight | What to record |
| --- | ---: | --- |
| In-Word friction | 15 | Number of context switches, clicks, copy/paste steps |
| Apply flow quality | 15 | Can the lawyer land a comment or redline cleanly |
| Clause memory | 10 | Can the tool reuse preferred fallback language |
| Cost visibility | 5 | Can the operator predict or bound spend |
| Overall operator confidence | 5 | Would a lawyer trust this in a real review |

## Raw Metrics To Capture

Capture these for every run:

- document ID
- product
- contract type
- review runtime in seconds
- ask runtime in seconds
- revise runtime in seconds
- must-catch issues found
- must-catch issues missed
- false positives
- wrong citations
- number of apply steps
- number of copy/paste steps
- time to first useful output
- whether the operator would use the result without major rewrite
- visible cost, if available

## Scorecard Template

Use one row per document per product.

| Document ID | Product | Contract type | Review score /100 | Ask score /50 | Revise score /50 | Workflow score /50 | Total /250 | Must-catch recall | Wrong citations | False positives | Time to first useful output | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| NDA-01 | Skua | NDA | 0 | 0 | 0 | 0 | 0 | 0% | 0 | 0 | 0s |  |
| NDA-01 | Spellbook | NDA | 0 | 0 | 0 | 0 | 0 | 0% | 0 | 0 | 0s |  |

## Operator Procedure

Run the eval like this:

1. Prepare the answer key.
2. Randomize product order per document to reduce operator bias.
3. Use the same document text and same prompts in both tools.
4. Record outputs immediately after each run.
5. Score outputs against the answer key after both tools are complete.
6. If possible, have a second reviewer rescore a subset blind.

## Prompt Discipline

Do not freestyle prompts.

For each document, lock:

- the review instruction
- the 3 ask questions
- the 2 revise instructions

If one tool requires slightly different wording to function, record that deviation in the notes.

## Suggested Ask Questions

Use variants of these depending on document type:

- Can the customer or recipient terminate or exit easily?
- Does the agreement auto-renew, and on what notice?
- Does the document let the vendor or recipient use data or confidential information for broader purposes?
- Unsupported check: Does this agreement require arbitration in New York?

## Suggested Revise Tasks

Use issue-heavy clauses like:

- subcontracting
- suspension
- data use
- auto-renewal
- residuals
- limitation of liability

## Decision Rule

After the first 12-document run, classify each category:

- `Skua clear win`
- `Spellbook clear win`
- `rough tie`

Skua is on the right path only if it shows a clear win in at least 3 of these 5 areas:

- Word workflow friction
- citation trustworthiness
- apply usability
- clause memory / fallback language reuse
- cost visibility / predictability

If Spellbook wins mainly on broad drafting quality but Skua wins on grounded Word workflow, keep the wedge.

If Spellbook also wins on Word workflow, grounded output, and immediate usability, stop widening scope and fix the product before more pilots.

## What To Look For

You are looking for one of three conclusions:

### 1. Skua wedge is real

Signs:

- Skua is not always “smarter,” but lawyers finish the job faster.
- Citations are more trustworthy.
- Apply actions are cleaner.
- Saved fallback language makes the second pass noticeably better.

### 2. Spellbook is stronger but unfocused for solos

Signs:

- Spellbook produces broader drafting output.
- Skua still wins on speed, grounding, and narrow review loops.

### 3. Skua is not yet differentiated enough

Signs:

- Spellbook matches or beats Skua on review quality.
- Spellbook is just as usable inside Word.
- Skua’s clause memory or cost controls do not create a visible user advantage.

## Output Summary Template

At the end of the eval, write a short summary with:

- where Skua clearly wins
- where Spellbook clearly wins
- where both products fail
- the top 3 product changes that would most improve Skua's chances
- whether to proceed to more pilots, pause for fixes, or narrow the wedge further

## Hard Rules

- Do not use real client documents.
- Do not move the goalposts after results come in.
- Do not add new product surface just because Spellbook is broader.
- Use the eval to sharpen the wedge, not copy the incumbent.
