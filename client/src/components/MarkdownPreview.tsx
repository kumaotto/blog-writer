import React, { useEffect, useState, useMemo, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const previewRef = useRef<HTMLDivElement>(null);
  const previousHtmlRef = useRef<string>('');

  // Debounce content updates by 300ms
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedContent(content);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [content]);

  // Configure marked with syntax highlighting
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Syntax highlighting error:', err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
    });
  }, []);

  // Parse markdown to HTML with memoization
  const htmlContent = useMemo(() => {
    try {
      return marked.parse(debouncedContent);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<p>Error parsing markdown</p>';
    }
  }, [debouncedContent]);

  // Apply differential rendering - only update DOM if content changed
  useEffect(() => {
    if (previewRef.current && htmlContent !== previousHtmlRef.current) {
      // Store scroll position
      const scrollTop = previewRef.current.scrollTop;
      
      // Update content
      previewRef.current.innerHTML = htmlContent;
      
      // Restore scroll position
      previewRef.current.scrollTop = scrollTop;
      
      // Apply syntax highlighting to code blocks
      const codeBlocks = previewRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
      
      // Update reference
      previousHtmlRef.current = htmlContent;
    }
  }, [htmlContent]);

  return (
    <div 
      ref={previewRef}
      className="markdown-preview"
    />
  );
};
