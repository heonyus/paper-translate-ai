"""
FastAPI Server for LangGraph Translation Agent
"""

from __future__ import annotations

import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from graph import get_translation_graph
from processors.pdf_pipeline import process_pdf

# 환경 변수 로드
load_dotenv()

# OpenAI API 키 확인
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# FastAPI 앱 생성
app = FastAPI(
    title="Paper Translation Agent",
    description="LangGraph-based academic paper translation service",
    version="1.1.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 구체적인 도메인 지정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranslationRequest(BaseModel):
    """번역 요청 모델"""

    text: str
    context: str = ""


class TranslationResponse(BaseModel):
    """번역 응답 모델"""

    translatedText: str
    contentType: str
    error: str | None = None


class PDFProcessResponse(BaseModel):
    """PDF 레이아웃 분석 응답 모델"""

    raw_lines: List[Dict[str, Any]]
    segmentation: Dict[str, Any]
    content_blocks: List[Dict[str, Any]]


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Paper Translation Agent API",
        "version": "1.1.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}


@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    """
    텍스트 번역 엔드포인트

    Args:
        request: 번역 요청 (text, context)

    Returns:
        번역 결과
    """

    try:
        graph = get_translation_graph()
        result = graph.translate(request.text, request.context)
        return TranslationResponse(**result)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(error)}",
        ) from error


@app.post("/classify")
async def classify_content(request: TranslationRequest):
    """
    콘텐츠 타입 분류 엔드포인트 (테스트용)

    Args:
        request: 분류할 텍스트

    Returns:
        콘텐츠 타입
    """

    try:
        from agents import ContentClassifier

        classifier = ContentClassifier()
        content_type = classifier.classify(request.text)

        return {
            "contentType": content_type,
            "text": request.text[:100] + "..." if len(request.text) > 100 else request.text,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {str(error)}",
        ) from error


@app.post("/process-pdf", response_model=PDFProcessResponse)
async def process_pdf_endpoint(file: UploadFile = File(...)):
    """
    PDF 레이아웃 분석 엔드포인트
    """

    try:
        pdf_bytes = await file.read()
        result = process_pdf(pdf_bytes)
        return PDFProcessResponse(**result)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(error)}",
        ) from error


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    print(f"Starting Paper Translation Agent on port {port}...")
    print("Make sure OPENAI_API_KEY is set in your environment")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )

