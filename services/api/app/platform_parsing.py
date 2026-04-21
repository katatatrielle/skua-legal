from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from pathlib import Path

from docx import Document as DocxDocument
from docx.document import Document as DocxDocumentType
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader


TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
CLAUSE_PATTERN = re.compile(r"^(?:\d+(?:\.\d+)*\.?|\([a-z0-9]+\)|[A-Z]\.)\s+")


@dataclass(slots=True)
class PlatformSegment:
    segment_type: str
    ordinal: int
    title: str | None
    text: str
    page_number: int | None
    anchor_json: dict[str, object]
    confidence: float
    embedding_tokens: dict[str, float]


@dataclass(slots=True)
class PlatformParseResult:
    parser_name: str
    parse_status: str
    confidence: float
    segments: list[PlatformSegment]
    full_text: str
    metadata: dict[str, object]


def parse_platform_document(
    *,
    document_version_id: str,
    filename: str,
    file_path: Path,
    source_kind: str,
) -> PlatformParseResult:
    suffix = file_path.suffix.lower()
    if source_kind == "word_selection" or suffix == ".txt":
        return parse_plaintext_document(document_version_id=document_version_id, text=file_path.read_text("utf-8"))
    if suffix == ".docx":
        return parse_docx_document(document_version_id=document_version_id, file_path=file_path)
    if suffix == ".pdf":
        return parse_pdf_document(document_version_id=document_version_id, file_path=file_path)
    raise ValueError(f"Unsupported file type for parsing: {filename}")


def parse_plaintext_document(*, document_version_id: str, text: str) -> PlatformParseResult:
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    parts = [normalize_text(part) for part in re.split(r"\n{2,}", normalized) if normalize_text(part)]
    if not parts and normalize_text(normalized):
        parts = [normalize_text(normalized)]
    segments = build_segments(
        document_version_id=document_version_id,
        blocks=[
            {
                "kind": "clause" if is_clause_like(part) else "paragraph",
                "text": part,
                "title": None,
                "page_number": None,
                "metadata": {"source_kind": "word_selection"},
                "confidence": 0.99,
            }
            for part in parts
        ],
    )
    return PlatformParseResult(
        parser_name="plaintext",
        parse_status="completed",
        confidence=0.99 if segments else 0.0,
        segments=segments,
        full_text="\n\n".join(segment.text for segment in segments),
        metadata={"source_kind": "word_selection", "segment_count": len(segments)},
    )


def parse_docx_document(*, document_version_id: str, file_path: Path) -> PlatformParseResult:
    document = DocxDocument(str(file_path))
    page_number = 1
    current_heading: str | None = None
    blocks: list[dict[str, object]] = []
    paragraph_index = 0
    table_index = 0

    for block in iter_block_items(document):
        if isinstance(block, Paragraph):
            paragraph_index += 1
            text = normalize_text(block.text)
            style_name = block.style.name if block.style else ""
            metadata = {
                "style_name": style_name,
                "paragraph_index": paragraph_index,
                "structural_id": f"docx:p:{paragraph_index}",
                "source_kind": "docx_paragraph",
            }
            if paragraph_has_page_break(block):
                metadata["page_break_after"] = True
            if text:
                if style_name.lower().startswith("heading"):
                    current_heading = text
                    blocks.append(
                        {
                            "kind": "heading",
                            "text": text,
                            "title": text,
                            "page_number": page_number,
                            "metadata": metadata,
                            "confidence": 0.99,
                        }
                    )
                else:
                    blocks.append(
                        {
                            "kind": "clause" if is_clause_like(text) else "paragraph",
                            "text": text,
                            "title": current_heading,
                            "page_number": page_number,
                            "metadata": metadata,
                            "confidence": 0.98,
                        }
                    )
            if metadata.get("page_break_after"):
                page_number += 1
        elif isinstance(block, Table):
            table_index += 1
            rows = extract_table_rows(block)
            if not rows:
                continue
            blocks.append(
                {
                    "kind": "table",
                    "text": "\n".join(rows),
                    "title": current_heading,
                    "page_number": page_number,
                    "metadata": {
                        "table_index": table_index,
                        "row_count": len(rows),
                        "structural_id": f"docx:tbl:{table_index}",
                        "source_kind": "docx_table",
                    },
                    "confidence": 0.97,
                }
            )

    segments = build_segments(document_version_id=document_version_id, blocks=blocks)
    return PlatformParseResult(
        parser_name="docx",
        parse_status="completed",
        confidence=0.98 if segments else 0.0,
        segments=segments,
        full_text="\n\n".join(segment.text for segment in segments),
        metadata={
            "page_count_estimate": max((segment.page_number or 1 for segment in segments), default=1),
            "paragraph_count": paragraph_index,
            "table_count": table_index,
            "segment_count": len(segments),
        },
    )


def parse_pdf_document(*, document_version_id: str, file_path: Path) -> PlatformParseResult:
    reader = PdfReader(str(file_path))
    blocks: list[dict[str, object]] = []
    low_confidence_regions = 0

    for page_number, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        page_blocks = split_pdf_blocks(raw_text)
        if not page_blocks and normalize_text(raw_text):
            page_blocks = [normalize_text(raw_text)]
        for block_index, block_text in enumerate(page_blocks, start=1):
            confidence = estimate_pdf_block_confidence(block_text)
            if confidence < 0.75:
                low_confidence_regions += 1
            blocks.append(
                {
                    "kind": "heading" if looks_like_heading(block_text) else ("clause" if is_clause_like(block_text) else "paragraph"),
                    "text": block_text,
                    "title": block_text if looks_like_heading(block_text) else None,
                    "page_number": page_number,
                    "metadata": {
                        "page_block_index": block_index,
                        "source_kind": "pdf_block",
                        "low_confidence": confidence < 0.75,
                    },
                    "confidence": confidence,
                }
            )

    segments = build_segments(document_version_id=document_version_id, blocks=blocks)
    overall_confidence = (
        sum(segment.confidence for segment in segments) / len(segments)
        if segments
        else 0.0
    )
    return PlatformParseResult(
        parser_name="pdf",
        parse_status="completed",
        confidence=round(overall_confidence, 4),
        segments=segments,
        full_text="\n\n".join(segment.text for segment in segments),
        metadata={
            "page_count": len(reader.pages),
            "low_confidence_region_count": low_confidence_regions,
            "segment_count": len(segments),
        },
    )


def build_segments(
    *,
    document_version_id: str,
    blocks: list[dict[str, object]],
) -> list[PlatformSegment]:
    cleaned_blocks = [block for block in blocks if str(block.get("text", "")).strip()]
    texts = [normalize_text(str(block["text"])) for block in cleaned_blocks]
    segments: list[PlatformSegment] = []
    for index, (block, text) in enumerate(zip(cleaned_blocks, texts, strict=False), start=1):
        prefix = texts[index - 2][-120:] if index > 1 else ""
        suffix = texts[index][:120] if index < len(texts) else ""
        anchor_json = {
            "document_version_id": document_version_id,
            "ordinal": index,
            "quote": text,
            "prefix": prefix,
            "suffix": suffix,
            "page": block.get("page_number"),
            "metadata": block.get("metadata", {}),
        }
        segments.append(
            PlatformSegment(
                segment_type=str(block["kind"]),
                ordinal=index,
                title=(str(block["title"]) if block.get("title") else None),
                text=text,
                page_number=(int(block["page_number"]) if block.get("page_number") is not None else None),
                anchor_json=anchor_json,
                confidence=float(block.get("confidence", 1.0)),
                embedding_tokens=build_embedding_tokens(text),
            )
        )
    return segments


def relocate_anchor(
    *,
    anchor: dict[str, object],
    candidate_segments: list[str],
) -> dict[str, object]:
    quote = normalize_text(str(anchor.get("quote", "")))
    prefix = normalize_text(str(anchor.get("prefix", "")))
    suffix = normalize_text(str(anchor.get("suffix", "")))
    if not quote:
        return {"strategy": "missing_quote", "matched_text": "", "score": 0.0, "ordinal": None}

    normalized_candidates = [normalize_text(candidate) for candidate in candidate_segments]
    for index, candidate in enumerate(normalized_candidates, start=1):
        if candidate == quote:
            return {"strategy": "exact_match", "matched_text": candidate, "score": 1.0, "ordinal": index}

    quote_hash = sha256_text(quote)
    for index, candidate in enumerate(normalized_candidates, start=1):
        if sha256_text(candidate) == quote_hash:
            return {"strategy": "quote_hash_match", "matched_text": candidate, "score": 0.99, "ordinal": index}

    best_index = None
    best_score = 0.0
    best_text = ""
    for index, candidate in enumerate(normalized_candidates, start=1):
        score = fuzzy_anchor_score(quote=quote, prefix=prefix, suffix=suffix, candidate=candidate)
        if score > best_score:
            best_score = score
            best_index = index
            best_text = candidate

    strategy = "fuzzy_neighborhood_match" if best_score >= 0.45 else "not_found"
    return {"strategy": strategy, "matched_text": best_text, "score": round(best_score, 4), "ordinal": best_index}


def search_segments(
    *,
    query: str,
    segments: list[PlatformSegment],
    limit: int,
    segment_types: set[str] | None = None,
) -> list[dict[str, object]]:
    normalized_query = normalize_text(query)
    query_vector = build_embedding_tokens(normalized_query)
    query_terms = set(query_vector)
    scored: list[dict[str, object]] = []
    for segment in segments:
        if segment_types and segment.segment_type not in segment_types:
            continue
        lexical_hits = len(query_terms.intersection(segment.embedding_tokens))
        lexical_score = lexical_hits / max(len(query_terms), 1)
        semantic_score = cosine_similarity(query_vector, segment.embedding_tokens)
        score = round((lexical_score * 0.6) + (semantic_score * 0.4), 4)
        if score <= 0:
            continue
        scored.append(
            {
                "segment_id": None,
                "ordinal": segment.ordinal,
                "segment_type": segment.segment_type,
                "title": segment.title,
                "text": segment.text,
                "page_number": segment.page_number,
                "anchor": segment.anchor_json,
                "score": score,
                "retrieval_mode": "hybrid" if semantic_score > 0 else "lexical",
            }
        )
    return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]


def iter_block_items(document: DocxDocumentType):
    parent = document.element.body
    for child in parent.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def extract_table_rows(table: Table) -> list[str]:
    rows: list[str] = []
    for row in table.rows:
        cells = [normalize_text(cell.text) for cell in row.cells]
        cells = [cell for cell in cells if cell]
        if cells:
            rows.append(" | ".join(cells))
    return rows


def split_pdf_blocks(text: str) -> list[str]:
    if not text:
        return []
    normalized_text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    blocks = [normalize_text(part) for part in re.split(r"\n{2,}", normalized_text) if normalize_text(part)]
    if blocks:
        if len(blocks) == 1 and "\n" in normalized_text:
            lines = [normalize_text(line) for line in normalized_text.splitlines() if normalize_text(line)]
            if len(lines) > 1:
                return lines
        return blocks
    lines = [normalize_text(line) for line in normalized_text.splitlines() if normalize_text(line)]
    return merge_short_lines(lines)


def merge_short_lines(lines: list[str]) -> list[str]:
    blocks: list[str] = []
    current: list[str] = []
    for line in lines:
        current.append(line)
        if line.endswith(".") or len(" ".join(current)) > 320:
            blocks.append(" ".join(current))
            current = []
    if current:
        blocks.append(" ".join(current))
    return blocks


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def paragraph_has_page_break(paragraph: Paragraph) -> bool:
    xml = getattr(getattr(paragraph, "_p", None), "xml", "")
    return 'w:type="page"' in xml or "lastRenderedPageBreak" in xml


def looks_like_heading(text: str) -> bool:
    normalized = normalize_text(text)
    return bool(normalized) and len(normalized) <= 120 and normalized == normalized.upper()


def is_clause_like(text: str) -> bool:
    normalized = normalize_text(text)
    return bool(CLAUSE_PATTERN.match(normalized)) or (len(normalized) > 80 and ";" in normalized)


def estimate_pdf_block_confidence(text: str) -> float:
    normalized = normalize_text(text)
    if not normalized:
        return 0.0
    broken_ratio = sum(1 for char in normalized if char in {"|", "_", "�"}) / max(len(normalized), 1)
    line_noise_penalty = 0.25 if broken_ratio > 0.02 else 0.0
    short_penalty = 0.15 if len(normalized) < 35 else 0.0
    return max(0.3, round(0.95 - line_noise_penalty - short_penalty, 4))


def build_embedding_tokens(text: str) -> dict[str, float]:
    counts: dict[str, float] = {}
    for token in TOKEN_PATTERN.findall(text.lower()):
        counts[token] = counts.get(token, 0.0) + 1.0
    length = math.sqrt(sum(value * value for value in counts.values()))
    if length == 0:
        return {}
    return {token: round(value / length, 6) for token, value in counts.items()}


def cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    if not left or not right:
        return 0.0
    return sum(value * right.get(token, 0.0) for token, value in left.items())


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def fuzzy_anchor_score(*, quote: str, prefix: str, suffix: str, candidate: str) -> float:
    quote_score = overlap_ratio(set(TOKEN_PATTERN.findall(quote.lower())), set(TOKEN_PATTERN.findall(candidate.lower())))
    prefix_score = overlap_ratio(set(TOKEN_PATTERN.findall(prefix.lower())), set(TOKEN_PATTERN.findall(candidate.lower())))
    suffix_score = overlap_ratio(set(TOKEN_PATTERN.findall(suffix.lower())), set(TOKEN_PATTERN.findall(candidate.lower())))
    return (quote_score * 0.7) + (prefix_score * 0.15) + (suffix_score * 0.15)


def overlap_ratio(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left.intersection(right)) / max(len(left), 1)
