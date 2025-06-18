import { vi } from 'vitest';
import React from 'react';

// Lightweight TipTap mock for faster test execution
export const createLightweightTipTapMock = () => {
  const editorInstance = {
    commands: {
      setContent: vi.fn().mockReturnThis(),
      clearContent: vi.fn().mockReturnThis(),
      setTextAlign: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleUnderline: vi.fn().mockReturnThis(),
      toggleBulletList: vi.fn().mockReturnThis(),
      toggleOrderedList: vi.fn().mockReturnThis(),
      setHeading: vi.fn().mockReturnThis(),
      setParagraph: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      blur: vi.fn().mockReturnThis(),
      undo: vi.fn().mockReturnThis(),
      redo: vi.fn().mockReturnThis()
    },
    getHTML: vi.fn(() => '<p>Mock content</p>'),
    getText: vi.fn(() => 'Mock content'),
    getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    isEmpty: false,
    isActive: vi.fn(() => false),
    can: () => ({
      chain: () => ({
        focus: () => ({
          undo: () => ({ run: () => true }),
          redo: () => ({ run: () => true })
        })
      })
    }),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    state: {
      doc: {
        textContent: 'Mock content'
      }
    },
    view: {
      dom: typeof document !== 'undefined' ? document.createElement('div') : {}
    }
  };

  return {
    useEditor: vi.fn((config) => {
      // Simple state tracking without complex TipTap internals
      let content = config?.content || '';
      
      const mockEditor = {
        ...editorInstance,
        getHTML: () => content,
        getText: () => content.replace(/<[^>]*>/g, ''),
        commands: {
          ...editorInstance.commands,
          setContent: vi.fn((newContent) => {
            content = newContent;
            if (config?.onUpdate) {
              config.onUpdate({ editor: mockEditor });
            }
            return mockEditor;
          })
        }
      };

      // Simulate initialization
      if (config?.onCreate) {
        setTimeout(() => config.onCreate({ editor: mockEditor }), 0);
      }

      return mockEditor;
    }),
    Editor: vi.fn().mockImplementation(() => editorInstance),
    EditorContent: vi.fn(({ editor }) => {
      return React.createElement('div', {
        'data-testid': 'editor-content',
        'role': 'textbox',
        'contentEditable': true,
        dangerouslySetInnerHTML: { __html: editor?.getHTML() || '<p>Mock content</p>' }
      });
    }),
    BubbleMenu: vi.fn(({ children }) => children),
    FloatingMenu: vi.fn(({ children }) => children),
    extensions: {
      StarterKit: vi.fn(),
      TextAlign: vi.fn(),
      Underline: vi.fn()
    }
  };
};

// Export as module mock
export default createLightweightTipTapMock();