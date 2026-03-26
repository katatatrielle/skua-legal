# CleanRoom Law — Domain Model

## Core Design
Matter-centric system

---

## Entity: Matter

Fields:
- id
- title
- course_or_context
- assignment_type
- main_issue
- objective
- status

Status:
- setup
- researching
- verifying_authorities
- outlining
- drafting
- reviewing
- completed

---

## Entity: ResearchItem

Fields:
- id
- matter_id
- raw_text
- source_type
- candidate_authority_names
- notes
- status

source_type:
- case_citation
- snippet
- note
- link
- proposition

status:
- new
- processed
- abandoned

---

## Entity: Authority

Fields:
- id
- matter_id
- cited_name
- normalized_name
- jurisdiction
- court
- date
- existence_status
- retrieval_status
- pinpoint_type
- excerpt_text
- excerpt_location
- speaker_classification
- fit_status
- risk_level
- verification_status
- status

existence_status:
- pass
- ambiguous
- fail_not_found

retrieval_status:
- pass
- fail_no_text

pinpoint_type:
- paragraphs
- pages
- none

speaker_classification:
- court_holding
- dicta
- quoted_authority
- party_submission
- procedural_history
- unknown

fit_status:
- supports
- supports_narrower_only
- partial_support
- does_not_support
- misleading_if_isolated

verification_status:
- not_started
- verified
- warning
- blocked
- invalidated

---

## Entity: OutlineNode

Fields:
- id
- matter_id
- parent_id
- title
- node_type
- proposition
- linked_authority_ids
- status
- taint_status

node_type:
- issue
- rule
- analysis
- counterargument
- conclusion

status:
- draft
- ready
- blocked

taint_status:
- clean
- suspect
- tainted

---

## Entity: DraftSection

Fields:
- id
- matter_id
- outline_node_id
- text
- status
- taint_status
- checkpoint_parent

status:
- draft
- verified
- invalidated

taint_status:
- clean
- suspect
- tainted

---

## Entity: ClaimSupportLink

Fields:
- id
- draft_section_id
- claim_text
- authority_id
- excerpt_text
- excerpt_location
- speaker_classification
- fit_status
- verification_summary
- status

status:
- verified
- warning
- blocked

---

## Entity: Defect

Fields:
- id
- authority_id
- artifact_type
- artifact_id
- defect_type
- severity
- restart_scope
- status

severity:
- critical
- major
- minor

restart_scope:
- authority
- proposition
- outline
- section

---

## Entity: Checkpoint

Fields:
- id
- matter_id
- stage
- status

stage:
- research
- authority_clean
- outline_clean
- section_clean

status:
- clean
- superseded

---

## Key Relationships

Matter → everything

Authority → supports:
- outline nodes
- claims

DraftSection → contains:
- ClaimSupportLinks

Defect → attaches to:
- authority
- outline node
- section