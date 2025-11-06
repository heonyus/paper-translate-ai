import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
}

export function MathRenderer({ text }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    try {
      // LaTeX 표현식을 찾아서 렌더링
      const rendered = renderMathInText(text);
      containerRef.current.innerHTML = rendered;
    } catch (error) {
      console.error('Math rendering error:', error);
      // 렌더링 실패 시 원본 텍스트 표시
      if (containerRef.current) {
        containerRef.current.textContent = text;
      }
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="text-sm text-gray-800 whitespace-pre-wrap math-content"
    />
  );
}

function renderMathInText(text: string): string {
  let result = text;

  // Display math ($$...$$)
  result = result.replace(/\$\$(.*?)\$\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });

  // Inline math ($...$)
  result = result.replace(/\$([^\$]+?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });

  // LaTeX environments (\[...\])
  result = result.replace(/\\\[(.*?)\\\]/g, (match, latex) => {
    try {
      return katex.renderToString(latex, { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });

  // LaTeX inline (\(...\))
  result = result.replace(/\\\((.*?)\\\)/g, (match, latex) => {
    try {
      return katex.renderToString(latex, { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });

  return result;
}

