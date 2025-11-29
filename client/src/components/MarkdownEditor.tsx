import React, { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from 'codemirror';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  articleId: string;
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onImageDrop: (file: File) => void;
  onMultipleImageDrop?: (files: File[]) => void;
  onCursorChange?: (position: number) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  articleId,
  content,
  onChange,
  onSave,
  onImageDrop,
  onMultipleImageDrop,
  onCursorChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Create initial state
    const startState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            onChange(newContent);
          }
          
          // Track cursor position
          if (update.selectionSet && onCursorChange) {
            const cursorPos = update.state.selection.main.head;
            onCursorChange(cursorPos);
          }
        }),
        // Handle drag and drop
        EditorView.domEventHandlers({
          drop: (event, view) => {
            event.preventDefault();
            
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
              // Filter for image files only
              const imageFiles = Array.from(files).filter(file => 
                file.type.startsWith('image/')
              );
              
              if (imageFiles.length > 0) {
                // Get the drop position
                const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
                if (pos !== null && onCursorChange) {
                  onCursorChange(pos);
                }
                
                // Handle multiple files if handler is provided
                if (imageFiles.length > 1 && onMultipleImageDrop) {
                  onMultipleImageDrop(imageFiles);
                } else {
                  // Single file or fallback to single handler
                  onImageDrop(imageFiles[0]);
                }
              }
            }
            
            return true;
          },
          dragover: (event) => {
            event.preventDefault();
            return true;
          },
        }),
      ],
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [articleId]); // Re-create editor when article changes

  // Update content when it changes externally
  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (currentContent !== content) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }
  }, [content]);

  return (
    <div className="markdown-editor-container">
      <div ref={editorRef} className="markdown-editor" />
    </div>
  );
};
