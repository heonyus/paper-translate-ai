"""
Content Classifier Agent
텍스트를 분석하여 콘텐츠 타입을 분류합니다.
"""

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage
from prompts.classifier_prompt import get_classifier_prompt
import re


class ContentClassifier:
    def __init__(self, model_name: str = "gpt-5-mini"):
        self.llm = ChatOpenAI(model=model_name, temperature=0)
    
    def classify(self, text: str) -> str:
        """
        텍스트를 분류합니다.
        
        Returns:
            'TEXT' | 'MATH' | 'TABLE' | 'IMAGE'
        """
        # 먼저 휴리스틱으로 빠르게 확인
        content_type = self._quick_classify(text)
        if content_type:
            return content_type
        
        # LLM을 사용한 분류
        prompt = get_classifier_prompt(text)
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        # 응답에서 분류 결과 추출
        classification = self._extract_classification(response.content)
        return classification
    
    def _quick_classify(self, text: str) -> str | None:
        """
        휴리스틱 기반 빠른 분류
        """
        # LaTeX 수식 패턴
        if re.search(r'\$\$?.*\$\$?|\\\[|\\\]|\\begin\{equation\}|\\begin\{align\}', text):
            return 'MATH'
        
        # 표 패턴 (마크다운 또는 파이프 구분)
        if re.search(r'\|.*\|.*\n\|[-:| ]+\|', text) or text.count('|') > 4:
            return 'TABLE'
        
        # 이미지 관련 키워드
        if re.search(r'\b(Figure|Fig\.|Table|Image|Caption)\b', text, re.IGNORECASE):
            # 실제 표인지 확인
            if 'Table' in text and '|' in text:
                return 'TABLE'
            return 'IMAGE'
        
        # 일반 텍스트는 None 반환 (LLM이 판단)
        return None
    
    def _extract_classification(self, response: str) -> str:
        """
        LLM 응답에서 분류 결과 추출
        """
        # "Classification: TEXT" 형식 찾기
        match = re.search(r'Classification:\s*(TEXT|MATH|TABLE|IMAGE)', response, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        # 응답에서 키워드 직접 찾기
        response_upper = response.upper()
        for content_type in ['MATH', 'TABLE', 'IMAGE', 'TEXT']:
            if content_type in response_upper:
                return content_type
        
        # 기본값
        return 'TEXT'

