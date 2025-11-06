"""
Math Translator Agent
수식을 번역하고 검증합니다.
"""

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage
from prompts.math_prompt import get_math_translation_prompt, get_math_validation_prompt
import re


class MathTranslator:
    def __init__(self, model_name: str = "gpt-5-mini"):
        self.llm = ChatOpenAI(model=model_name, temperature=0.1)
    
    def translate(self, text: str, max_retries: int = 2) -> str:
        """
        수식을 한국어로 번역하고 LaTeX를 검증합니다.
        
        Args:
            text: 번역할 수식 텍스트
            max_retries: 검증 실패 시 최대 재시도 횟수
        
        Returns:
            번역된 텍스트 (LaTeX 포함)
        """
        for attempt in range(max_retries + 1):
            # 번역 수행
            prompt = get_math_translation_prompt(text)
            response = self.llm.invoke([HumanMessage(content=prompt)])
            translated = response.content.strip()
            
            # LaTeX 검증
            if self._validate_latex(translated):
                return translated
            
            # 실패 시 재시도
            if attempt < max_retries:
                print(f"LaTeX validation failed, retrying... (attempt {attempt + 1}/{max_retries})")
                continue
            
            # 최종 실패 시 원본 반환
            print("Warning: LaTeX validation failed after retries, returning original")
            return text
        
        return translated
    
    def _validate_latex(self, text: str) -> bool:
        """
        LaTeX 구문이 유효한지 기본적인 검증을 수행합니다.
        """
        # 기본 균형 체크
        if not self._check_balanced_delimiters(text):
            return False
        
        # 필수 닫기 태그 체크
        begin_matches = re.findall(r'\\begin\{(\w+)\}', text)
        end_matches = re.findall(r'\\end\{(\w+)\}', text)
        
        if begin_matches != end_matches:
            return False
        
        return True
    
    def _check_balanced_delimiters(self, text: str) -> bool:
        """
        괄호와 수식 구분자의 균형을 확인합니다.
        """
        # 중괄호 균형
        if text.count('{') != text.count('}'):
            return False
        
        # $ 구분자 균형 (홀수개면 불균형)
        single_dollar = len(re.findall(r'(?<!\$)\$(?!\$)', text))
        if single_dollar % 2 != 0:
            return False
        
        # $$ 구분자 균형
        double_dollar = len(re.findall(r'\$\$', text))
        if double_dollar % 2 != 0:
            return False
        
        # \[ \] 균형
        if text.count('\\[') != text.count('\\]'):
            return False
        
        # \( \) 균형
        if text.count('\\(') != text.count('\\)'):
            return False
        
        return True

