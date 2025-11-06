"""
Table Translator Agent
표 구조를 유지하면서 번역합니다.
"""

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage
from prompts.table_prompt import get_table_translation_prompt


class TableTranslator:
    def __init__(self, model_name: str = "gpt-5-mini"):
        self.llm = ChatOpenAI(model=model_name, temperature=0.1)
    
    def translate(self, text: str) -> str:
        """
        표를 번역합니다.
        
        Args:
            text: 번역할 표 텍스트
        
        Returns:
            번역된 표 (구조 유지)
        """
        prompt = get_table_translation_prompt(text)
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        translated = response.content.strip()
        
        # 표 구조 검증
        if self._validate_table_structure(text, translated):
            return translated
        else:
            print("Warning: Table structure validation failed, returning original")
            return text
    
    def _validate_table_structure(self, original: str, translated: str) -> bool:
        """
        원본과 번역본의 표 구조가 동일한지 확인합니다.
        """
        # 행 개수 확인
        original_rows = original.count('\n')
        translated_rows = translated.count('\n')
        
        if abs(original_rows - translated_rows) > 1:  # 1행 차이 허용
            return False
        
        # 파이프 개수 확인 (열 개수)
        original_pipes = original.count('|')
        translated_pipes = translated.count('|')
        
        if abs(original_pipes - translated_pipes) > 2:  # 약간의 오차 허용
            return False
        
        return True

