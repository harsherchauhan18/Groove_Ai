import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import useGraphSyncStore from '../../store/useGraphSyncStore';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

/**
 * Enhanced Monaco-based Code Viewer.
 * Features: Bi-directional active line/node synchronization with the graph.
 */
export default function CodeViewer({ repoId }) {
  const editorRef = useRef(null);
  const [content, setContent] = useState('// Select a function or file to view source code...');
  const [loading, setLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  
  const { activeFilePath, activeLine, setActiveLine } = useGraphSyncStore();

  const token = localStorage.getItem('accessToken');

  /**
   * Effect: Fetch full file content when the active file shifts.
   */
  useEffect(() => {
    if (activeFilePath && activeFilePath !== currentFile) {
      const fetchFileContent = async () => {
        setLoading(true);
        try {
          const resp = await axios.get(`${FASTAPI_URL}/api/code/${repoId}`, {
            params: { filePath: activeFilePath },
            headers: { Authorization: `Bearer ${token}` }
          });
          setContent(resp.data.content);
          setCurrentFile(activeFilePath);
        } catch (error) {
          console.error('Failed to load source code:', error);
          setContent('// Error: Could not retrieve file content from database.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchFileContent();
    }
  }, [activeFilePath, currentFile, repoId, token]);

  /**
   * Effect: Auto-scroll to selected function line when activeLine changes.
   */
  useEffect(() => {
    if (editorRef.current && activeLine) {
      const editor = editorRef.current;
      editor.revealLineInCenter(activeLine);
      editor.setPosition({ lineNumber: activeLine, column: 1 });
      editor.focus();
    }
  }, [activeLine]);

  /**
   * Handle Editor Mount: Capture instance and bind event listeners for sync.
   */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Debounced cursor selection tracking to update active node in graph
    let debounceTimer;
    editor.onDidChangeCursorPosition((e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const line = e.position.lineNumber;
        if (activeFilePath) {
          setActiveLine(activeFilePath, line);
        }
      }, 120);
    });
  };

  /**
   * Determine code language based on file extension.
   */
  const getLanguage = (path) => {
    if (!path) return 'javascript';
    const ext = path.split('.').pop().toLowerCase();
    const map = { py: 'python', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript' };
    return map[ext] || 'plaintext';
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', zIndex: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#f8fafc'
        }}>
          Reconstructing code from database chunks...
        </div>
      )}
      <Editor
        height="100%"
        theme="vs-dark"
        language={getLanguage(activeFilePath)}
        value={content}
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          minimap: { enabled: true },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 20 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorStyle: 'line',
          smoothScrolling: true
        }}
      />
    </div>
  );
}
