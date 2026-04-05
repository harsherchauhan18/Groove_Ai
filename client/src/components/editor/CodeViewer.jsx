import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import useCodebaseStore from '../../store/useCodebaseStore.js';

export default function CodeViewer({ repoId }) {
  const { activeFilePath, fetchFileContent } = useCodebaseStore();
  const [code, setCode] = useState('// Select a file from the repository map to view its code base.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeFilePath && repoId) {
      setLoading(true);
      fetchFileContent(repoId, activeFilePath).then(data => {
        setCode(data);
        setLoading(false);
      });
    }
  }, [activeFilePath, repoId, fetchFileContent]);

  const getLanguage = () => {
    if (!activeFilePath) return 'javascript';
    const ext = activeFilePath.split('.').pop();
    if (['py'].includes(ext)) return 'python';
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'javascript';
    return 'plaintext';
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#1e1e1e' }}>
      <Editor
        height="100%"
        language={getLanguage()}
        theme="vs-dark"
        value={loading ? '// Loading source...' : code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          padding: { top: 16 }
        }}
      />
    </div>
  );
}
