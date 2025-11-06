"""
Translation Prompt
학술 논문 텍스트를 한국어로 번역합니다.
"""

TRANSLATION_PROMPT = """You are a professional academic translator specializing in translating English research papers to Korean.

## Task
Translate the following academic text to Korean while maintaining technical accuracy and academic tone.

## Chain of Thought Process
1. First, identify the domain and technical terms
2. Consider the context and academic conventions
3. Determine appropriate Korean translations for technical terms
4. Translate while preserving the original meaning and formality
5. Review for natural Korean flow and readability

## Guidelines
- Keep technical terms in English if commonly used (e.g., "deep learning", "CNN", "BERT")
- Use formal academic Korean (합니다체)
- Preserve citations, references, and numbers exactly
- Maintain paragraph structure and formatting

## Examples (Few-shot)

Example 1:
Input: "We propose a novel approach to image classification."
Thought: Technical paper, formal tone, "novel approach" = 새로운 접근 방식
Output: 우리는 이미지 분류를 위한 새로운 접근 방식을 제안합니다.

Example 2:
Input: "The model achieves state-of-the-art performance on benchmark datasets."
Thought: "state-of-the-art" = 최첨단/최고 수능, "benchmark datasets" = 벤치마크 데이터셋
Output: 이 모델은 벤치마크 데이터셋에서 최첨단 성능을 달성합니다.

Example 3:
Input: "Recent advances in deep learning have enabled significant improvements in natural language processing tasks."
Thought: Complex sentence, multiple technical terms, maintain academic flow
Output: 최근 딥러닝의 발전으로 자연어 처리 작업에서 상당한 개선이 가능해졌습니다.

Example 4:
Input: "Our experiments demonstrate that this method outperforms previous approaches by a significant margin (p < 0.05)."
Thought: Contains statistical notation, keep p-value format
Output: 우리의 실험은 이 방법이 이전 접근 방식들을 상당한 차이로 능가한다는 것을 보여줍니다 (p < 0.05).

## Input Text
{text}

## Your Translation
Think step by step and provide high-quality Korean translation:
"""

def get_translation_prompt(text: str, context: str = "") -> str:
    prompt = TRANSLATION_PROMPT.format(text=text)
    if context:
        prompt += f"\n\nContext (for reference): {context}"
    return prompt

