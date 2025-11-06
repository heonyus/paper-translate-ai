"""
Math Translation Prompt
수식을 번역하고 한국어 설명을 추가합니다.
"""

MATH_TRANSLATION_PROMPT = """You are an expert mathematical translator for academic papers.

## Task
Translate the given mathematical expression to Korean, adding Korean explanations while preserving the LaTeX notation.

## Chain of Thought Process
1. First, identify the LaTeX expressions and their meaning
2. Parse the mathematical notation and symbols
3. Provide Korean explanation of what the equation represents
4. Preserve the exact LaTeX notation
5. Verify the LaTeX syntax is correct

## Guidelines
- Keep LaTeX notation EXACTLY as it appears
- Add Korean explanation before or after the equation
- Use proper mathematical Korean terminology
- Ensure LaTeX is syntactically valid

## Examples (Few-shot)

Example 1:
Input: "The loss function is $L = \\sum_{i=1}^n (y_i - \\hat{{y}}_i)^2$"
Thought: Loss function with summation, explain in Korean but keep LaTeX intact
Output: 손실 함수는 $L = \\sum_{i=1}^n (y_i - \\hat{{y}}_i)^2$로 정의됩니다. 여기서 $y_i$는 실제 값이고 $\\hat{{y}}_i$는 예측 값입니다.

Example 2:
Input: "$$f(x) = \\frac{{1}}{{1 + e^{{-x}}}}$$"
Thought: Sigmoid function, explain it's the activation function
Output: $$f(x) = \\frac{{1}}{{1 + e^{{-x}}}}$$
이것은 시그모이드 활성화 함수입니다.

Example 3:
Input: "Let $\\mathbf{{W}} \\in \\mathbb{{R}}^{{d \\times k}}$ be the weight matrix."
Thought: Matrix notation with dimensions, keep mathematical formatting
Output: $\\mathbf{{W}} \\in \\mathbb{{R}}^{{d \\times k}}$를 가중치 행렬이라고 하겠습니다.

Example 4:
Input: "$$\\nabla_{{\\theta}} J(\\theta) = \\mathbb{{E}}[\\nabla_{{\\theta}} \\log \\pi_{{\\theta}}(a|s) A(s,a)]$$"
Thought: Policy gradient equation, complex notation, keep all LaTeX
Output: $$\\nabla_{{\\theta}} J(\\theta) = \\mathbb{{E}}[\\nabla_{{\\theta}} \\log \\pi_{{\\theta}}(a|s) A(s,a)]$$
이것은 정책 그래디언트 수식으로, $\\theta$에 대한 목적 함수 $J$의 그래디언트를 나타냅니다.

## Input Text
{text}

## Your Translation
Provide Korean explanation with preserved LaTeX notation:
"""

MATH_VALIDATION_PROMPT = """You are a LaTeX syntax validator.

## Task
Check if the following LaTeX expression is syntactically valid.

## LaTeX Expression
{latex}

## Validation
Respond with:
- VALID: if the LaTeX is syntactically correct
- INVALID: if there are syntax errors

Also provide the corrected version if invalid.

Format:
Status: [VALID|INVALID]
Corrected: [corrected LaTeX if invalid, otherwise same as input]
"""

def get_math_translation_prompt(text: str) -> str:
    return MATH_TRANSLATION_PROMPT.format(text=text)

def get_math_validation_prompt(latex: str) -> str:
    return MATH_VALIDATION_PROMPT.format(latex=latex)

