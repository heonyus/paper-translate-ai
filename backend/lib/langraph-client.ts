/**
 * LangGraph Agent 클라이언트
 * FastAPI 서버와 통신하여 번역 요청을 처리합니다.
 */

const LANGRAPH_URL = process.env.LANGRAPH_AGENT_URL || 'http://localhost:8000';

export interface TranslationRequest {
  text: string;
  context?: string;
}

export interface TranslationResponse {
  translatedText: string;
  contentType: 'TEXT' | 'MATH' | 'TABLE' | 'IMAGE';
  confidence?: number;
}

export class LangGraphClient {
  private baseUrl: string;

  constructor(baseUrl: string = LANGRAPH_URL) {
    this.baseUrl = baseUrl;
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`LangGraph API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling LangGraph API:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const langGraphClient = new LangGraphClient();

