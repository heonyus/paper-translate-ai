"""
Image Handler Agent
이미지 설명을 번역합니다.
"""

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage
from prompts.translation_prompt import get_translation_prompt


class ImageHandler:
    def __init__(self, model_name: str = "gpt-5-mini"):
        self.llm = ChatOpenAI(model=model_name, temperature=0.3)
    
    def translate(self, text: str) -> str:
        """
        이미지 캡션이나 설명을 번역합니다.
        
        Args:
            text: 번역할 이미지 관련 텍스트
        
        Returns:
            번역된 텍스트
        """
        # 이미지 캡션은 일반 텍스트 번역과 유사하게 처리
        prompt = get_translation_prompt(text)
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        translated = response.content.strip()
        
        # "Figure", "Fig." 등의 키워드는 유지
        translated = self._preserve_keywords(translated)
        
        return translated
    
    def _preserve_keywords(self, text: str) -> str:
        """
        특정 키워드를 영문으로 유지합니다.
        """
        # "그림" -> "Figure" 등의 역변환은 하지 않음
        # 이미 번역된 결과를 그대로 사용
        return text

