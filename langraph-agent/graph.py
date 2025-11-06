"""
LangGraph Workflow
번역 에이전트들을 연결하여 워크플로우를 구성합니다.
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END
from agents import (
    ContentClassifier,
    TextTranslator,
    MathTranslator,
    TableTranslator,
    ImageHandler
)


class TranslationState(TypedDict):
    """번역 워크플로우의 상태"""
    text: str
    context: str
    content_type: str
    translated_text: str
    error: str | None


class TranslationGraph:
    """번역 워크플로우 그래프"""
    
    def __init__(self):
        self.classifier = ContentClassifier()
        self.text_translator = TextTranslator()
        self.math_translator = MathTranslator()
        self.table_translator = TableTranslator()
        self.image_handler = ImageHandler()
        
        # 그래프 구축
        self.graph = self._build_graph()
        self.app = self.graph.compile()
    
    def _build_graph(self) -> StateGraph:
        """LangGraph 워크플로우 구축"""
        workflow = StateGraph(TranslationState)
        
        # 노드 추가
        workflow.add_node("classify", self._classify_node)
        workflow.add_node("translate_text", self._translate_text_node)
        workflow.add_node("translate_math", self._translate_math_node)
        workflow.add_node("translate_table", self._translate_table_node)
        workflow.add_node("handle_image", self._handle_image_node)
        
        # 시작점
        workflow.set_entry_point("classify")
        
        # 조건부 라우팅
        workflow.add_conditional_edges(
            "classify",
            self._route_by_content_type,
            {
                "TEXT": "translate_text",
                "MATH": "translate_math",
                "TABLE": "translate_table",
                "IMAGE": "handle_image",
            }
        )
        
        # 모든 번역 노드는 END로 연결
        workflow.add_edge("translate_text", END)
        workflow.add_edge("translate_math", END)
        workflow.add_edge("translate_table", END)
        workflow.add_edge("handle_image", END)
        
        return workflow
    
    def _classify_node(self, state: TranslationState) -> TranslationState:
        """콘텐츠 분류 노드"""
        try:
            content_type = self.classifier.classify(state["text"])
            state["content_type"] = content_type
        except Exception as e:
            state["error"] = f"Classification error: {str(e)}"
            state["content_type"] = "TEXT"  # 기본값
        return state
    
    def _translate_text_node(self, state: TranslationState) -> TranslationState:
        """텍스트 번역 노드"""
        try:
            translated = self.text_translator.translate(
                state["text"],
                state.get("context", "")
            )
            state["translated_text"] = translated
        except Exception as e:
            state["error"] = f"Text translation error: {str(e)}"
            state["translated_text"] = state["text"]
        return state
    
    def _translate_math_node(self, state: TranslationState) -> TranslationState:
        """수식 번역 노드"""
        try:
            translated = self.math_translator.translate(state["text"])
            state["translated_text"] = translated
        except Exception as e:
            state["error"] = f"Math translation error: {str(e)}"
            state["translated_text"] = state["text"]
        return state
    
    def _translate_table_node(self, state: TranslationState) -> TranslationState:
        """표 번역 노드"""
        try:
            translated = self.table_translator.translate(state["text"])
            state["translated_text"] = translated
        except Exception as e:
            state["error"] = f"Table translation error: {str(e)}"
            state["translated_text"] = state["text"]
        return state
    
    def _handle_image_node(self, state: TranslationState) -> TranslationState:
        """이미지 처리 노드"""
        try:
            translated = self.image_handler.translate(state["text"])
            state["translated_text"] = translated
        except Exception as e:
            state["error"] = f"Image handling error: {str(e)}"
            state["translated_text"] = state["text"]
        return state
    
    def _route_by_content_type(
        self, state: TranslationState
    ) -> Literal["TEXT", "MATH", "TABLE", "IMAGE"]:
        """콘텐츠 타입에 따라 라우팅"""
        return state["content_type"]
    
    def translate(self, text: str, context: str = "") -> dict:
        """
        텍스트를 번역합니다.
        
        Args:
            text: 번역할 텍스트
            context: 추가 컨텍스트
        
        Returns:
            번역 결과 딕셔너리
        """
        initial_state: TranslationState = {
            "text": text,
            "context": context,
            "content_type": "",
            "translated_text": "",
            "error": None,
        }
        
        # 그래프 실행
        result = self.app.invoke(initial_state)
        
        return {
            "translatedText": result["translated_text"],
            "contentType": result["content_type"],
            "error": result.get("error"),
        }


# 전역 인스턴스 (FastAPI에서 재사용)
translation_graph = None


def get_translation_graph() -> TranslationGraph:
    """번역 그래프 싱글톤 인스턴스 가져오기"""
    global translation_graph
    if translation_graph is None:
        translation_graph = TranslationGraph()
    return translation_graph

