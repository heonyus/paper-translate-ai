"""
Text Translator Agent
일반 텍스트를 한국어로 번역합니다.
"""

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage
from prompts.translation_prompt import get_translation_prompt


class TextTranslator:
    def __init__(self, model_name: str = "gpt-5-mini"):
        self.llm = ChatOpenAI(model=model_name, temperature=0.3)
    
    def translate(self, text: str, context: str = "") -> str:
        """
        텍스트를 한국어로 번역합니다.
        
        Args:
            text: 번역할 텍스트
            context: 추가 컨텍스트 (선택사항)
        
        Returns:
            번역된 한국어 텍스트
        """
        prompt = get_translation_prompt(text, context)
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        # 번역 결과 정제
        translated = self._clean_translation(response.content)
        return translated
    
    def _clean_translation(self, text: str) -> str:
        """
        번역 결과에서 불필요한 부분 제거
        """
        # "Thought:", "Output:" 등의 메타 텍스트 제거
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # 메타 텍스트 스킵
            if line.startswith(('Thought:', 'Output:', 'Translation:', 'Korean:')):
                # 콜론 이후 내용만 가져오기
                parts = line.split(':', 1)
                if len(parts) > 1:
                    cleaned_lines.append(parts[1].strip())
            elif not line.startswith(('Reasoning:', 'Analysis:')):
                cleaned_lines.append(line)
        
        result = '\n'.join(cleaned_lines).strip()
        return result if result else text

