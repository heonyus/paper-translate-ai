"""
Prompt template for PDF layout segmentation.
"""

from __future__ import annotations

from typing import Iterable, List, Protocol, Tuple


class SupportsLineProtocol(Protocol):
  line_id: str
  page: int
  text: str
  bbox: Tuple[float, float, float, float]
  font_size: float
  column_hint: float


def build_layout_prompt(page_number: int, lines: Iterable[SupportsLineProtocol]) -> str:
  """
  Creates an instruction prompt for the LLM to segment lines into blocks.
  """
  line_descriptions: List[str] = []
  for line in lines:
    line_descriptions.append(
      f'{{"line_id":"{line.line_id}","text":{_escape_json_string(line.text)},"column_hint":{line.column_hint:.2f},"font_size":{line.font_size:.2f}}}'
    )
  lines_payload = ",\n  ".join(line_descriptions)

  return f"""
You act as a PDF layout analyst. You are given the text lines from page {page_number} of an academic paper.
Each line contains the extracted text along with a column hint (x-axis position) and average font size.

Your task:
1. Identify logical blocks such as section headings, paragraph bodies, lists, figure/table captions, footnotes, etc.
2. NEVER merge text coming from different columns into the same block.
3. Preserve the ordering from top to bottom, left to right.
4. Output a JSON object with the shape:
{{
  "blocks": [
    {{"type": "HEADER", "line_ids": ["line-id-1"]}},
    {{"type": "BODY", "line_ids": ["line-id-2","line-id-3"]}},
    ...
  ]
}}

- Valid types: HEADER, BODY, BULLET, CAPTION, TABLE, IMAGE_REF, FOOTNOTE.
- Use HEADER for titles/subtitles.
- Use BODY for normal paragraphs.
- Do not invent text; rely solely on provided lines.

Lines:
[
  {lines_payload}
]

Return ONLY the JSON.
""".strip()


def _escape_json_string(value: str) -> str:
  """Escapes characters so that the text can be safely embedded into JSON."""
  escaped = (
    value.replace("\\", "\\\\")
    .replace('"', '\\"')
    .replace("\n", "\\n")
    .replace("\r", "")
  )
  return f'"{escaped}"'
