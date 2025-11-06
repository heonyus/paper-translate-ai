"""
PDF processing pipeline leveraging LangGraph and LLM-assisted layout understanding.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple
from dataclasses import dataclass
import statistics

import fitz  # PyMuPDF
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage

from prompts.layout_prompt import build_layout_prompt


@dataclass
class RawLine:
  """Represents a single textual line extracted from the PDF."""

  line_id: str
  page: int
  text: str
  bbox: Tuple[float, float, float, float]
  font_size: float
  font_name: str | None
  column_hint: float


@dataclass
class ContentBlock:
  """Structured block after LLM segmentation."""

  block_id: str
  page: int
  block_type: str
  text: str
  bbox: Tuple[float, float, float, float]
  line_ids: List[str]


def extract_raw_lines(pdf_bytes: bytes) -> List[RawLine]:
  """Extracts raw lines with geometry data using PyMuPDF."""
  doc = fitz.open(stream=pdf_bytes, filetype="pdf")
  lines: List[RawLine] = []

  for page_index, page in enumerate(doc):
    text_dict = page.get_text("dict")
    blocks = text_dict.get("blocks", [])

    for block_index, block in enumerate(blocks):
      if block.get("type") != 0:
        continue

      for line_index, line in enumerate(block.get("lines", [])):
        spans = line.get("spans", [])
        raw_text = "".join(span.get("text", "") for span in spans)
        text = raw_text.strip()
        if not text:
          continue

        bbox = tuple(line.get("bbox", (0, 0, 0, 0)))
        font_sizes = [span.get("size", 0.0) for span in spans if span.get("size")]
        font_names = [span.get("font", "") for span in spans if span.get("font")]
        font_size = statistics.mean(font_sizes) if font_sizes else 0.0
        font_name = font_names[0] if font_names else None

        x0, _, x1, _ = bbox
        column_hint = (x0 + x1) / 2.0

        line_id = f"p{page_index + 1}-b{block_index}-l{line_index}"
        lines.append(
          RawLine(
            line_id=line_id,
            page=page_index + 1,
            text=text,
            bbox=bbox,
            font_size=font_size,
            font_name=font_name,
            column_hint=column_hint,
          )
        )

  return lines


def segment_layout_with_llm(lines: List[RawLine], model_name: str = "gpt-5-mini") -> Dict[int, Dict[str, Any]]:
  """
  Requests the LLM to segment lines into logical content blocks.

  Returns:
      Dict[page_number, segmentation_json]
  """
  if not lines:
    return {}

  llm = ChatOpenAI(model=model_name, temperature=0)
  pages: Dict[int, List[RawLine]] = {}
  for line in lines:
    pages.setdefault(line.page, []).append(line)

  segmentation: Dict[int, Dict[str, Any]] = {}

  for page, page_lines in pages.items():
    prompt = build_layout_prompt(page, page_lines)
    response = llm.invoke([HumanMessage(content=prompt)])
    raw_content = response.content
    parsed = _safe_parse_json(raw_content)
    segmentation[page] = {
      "raw": raw_content,
      "parsed": parsed,
    }

  return segmentation


def align_blocks(
  lines: List[RawLine],
  segmentation: Dict[int, Any],
) -> List[ContentBlock]:
  """
  Aligns LLM segmentation results with raw line geometry to create structured blocks.
  """
  line_lookup: Dict[str, RawLine] = {line.line_id: line for line in lines}
  blocks: List[ContentBlock] = []

  for page, payload in segmentation.items():
    parsed = payload.get("parsed", {})
    if not parsed:
      continue

    for idx, block in enumerate(parsed.get("blocks", [])):
      line_ids: List[str] = block.get("line_ids", [])
      filtered_lines = [line_lookup[line_id] for line_id in line_ids if line_id in line_lookup]
      if not filtered_lines:
        continue

      text = "\n".join(raw_line.text for raw_line in filtered_lines).strip()
      bbox = _merge_bboxes([raw_line.bbox for raw_line in filtered_lines])
      block_type = block.get("type", "BODY").upper()
      block_id = f"p{page}-blk-{idx}"

      blocks.append(
        ContentBlock(
          block_id=block_id,
          page=page,
          block_type=block_type,
          text=text,
          bbox=bbox,
          line_ids=line_ids,
        )
      )

  return blocks


def process_pdf(pdf_bytes: bytes, model_name: str = "gpt-5-mini") -> Dict[str, Any]:
  """
  Executes the full PDF processing pipeline.
  """
  raw_lines = extract_raw_lines(pdf_bytes)
  segmentation = segment_layout_with_llm(raw_lines, model_name=model_name)
  content_blocks = align_blocks(raw_lines, segmentation)

  return {
    "raw_lines": [line.__dict__ for line in raw_lines],
    "segmentation": segmentation,
    "content_blocks": [
      {
        "id": block.block_id,
        "page": block.page,
        "type": block.block_type,
        "text": block.text,
        "bbox": block.bbox,
        "line_ids": block.line_ids,
      }
      for block in content_blocks
    ],
  }


def _merge_bboxes(bboxes: List[Tuple[float, float, float, float]]) -> Tuple[float, float, float, float]:
  """Merges multiple bounding boxes into one."""
  xs0 = [bbox[0] for bbox in bboxes]
  ys0 = [bbox[1] for bbox in bboxes]
  xs1 = [bbox[2] for bbox in bboxes]
  ys1 = [bbox[3] for bbox in bboxes]

  return (min(xs0), min(ys0), max(xs1), max(ys1))


def _safe_parse_json(raw_response: str) -> Dict[str, Any]:
  """Attempts to parse the LLM response as JSON with graceful failure."""
  import json

  try:
    return json.loads(raw_response)
  except json.JSONDecodeError:
    return {}
