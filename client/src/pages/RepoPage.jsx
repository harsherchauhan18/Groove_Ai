import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  FileCode, 
  Search, 
  ChevronRight,
  Bot,
  Terminal,
  Layers,
  ArrowRight,
  Loader2,
  Code
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar.jsx';
import aiService from '../services/aiService';
import useNavigationStore from '../store/useNavigationStore';
import '../styles/Dashboard.css';

export default function RepoPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  
  const { 
    navResult, 
    alternatives, 
    isSearching, 
    handleNavigate,
    clearNavigation,
    searchQuery,
    setSearchQuery
  } = useNavigationStore();

  const [fileContent, setFileContent] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Sync with store search results
  useEffect(() => {
    if (navResult) {
      loadFile(navResult.file_path, navResult.start_line);
      setShowResults(true);
    }
  }, [navResult]);

  const loadFile = async (path, line = 1) => {
    try {
      const data = await aiService.getFileContent(repoId, path);
      setFileContent(data.content);
      setCurrentFile(path);
      
      // Give Monaco a moment to render before scrolling
      setTimeout(() => {
         if (editorRef.current) {
            editorRef.current.revealLineInCenter(line);
            editorRef.current.setSelection({
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line + 5,
              endColumn: 100
            });
         }
      }, 100);
    } catch (e) {
      console.error("Failed to load file", e);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    await handleNavigate(repoId, searchQuery);
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // Mock Graph Generation for UX
  useEffect(() => {
    if (currentFile) {
        const fileName = currentFile.split('/').pop();
        const newNodes = [
          { 
            id: 'root', 
            data: { label: 'Repository' }, 
            position: { x: 250, y: 0 }, 
            style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } 
          },
          { 
            id: 'current', 
            data: { label: fileName }, 
            position: { x: 250, y: 150 },
            style: { 
              background: 'rgba(99, 102, 241, 0.4)', 
              color: '#fff', 
              border: '2px solid #6366f1',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
            } 
          }
        ];
        const newEdges = [{ id: 'e1-2', source: 'root', target: 'current', animated: true, style: { stroke: '#6366f1' } }];
        
        // Add neighbors from alternatives
        alternatives.slice(0, 3).forEach((alt, i) => {
           const id = `alt-${i}`;
           newNodes.push({
             id,
             data: { label: alt.file_path.split('/').pop() },
             position: { x: 100 + (i * 150), y: 300 },
             style: { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }
           });
           newEdges.push({ id: `e-alt-${i}`, source: 'current', target: id, stroke: '#334155' });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }
  }, [currentFile, alternatives]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', background: '#0f172a', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Navigator Search Top Bar */}
        <div style={{ 
          padding: '1.25rem 2rem', 
          background: 'rgba(30, 41, 59, 0.6)', 
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Terminal color="#6366f1" size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap' }}>Codebase Navigator</h2>
           </div>

           <form onSubmit={handleSearch} style={{ flex: 1, position: 'relative' }}>
              <Search 
                size={18} 
                color="#64748b" 
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} 
              />
              <input 
                type="text"
                placeholder="Ask about handles, logic, or variable names... (e.g. 'where is auth handled?')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '1rem',
                  padding: '12px 14px 12px 48px',
                  color: '#f1f5f9',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s'
                }}
                disabled={isSearching}
              />
              {isSearching && (
                 <Loader2 className="spin" size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
              )}
           </form>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
              <Layers size={14} /> 
              <span>Analyzing Repo: {repoId}</span>
           </div>
        </div>

        {/* Navigator Layout Split */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 350px', overflow: 'hidden' }}>
           
           {/* Left Sidebar: Results List */}
           <div style={{ 
              background: 'rgba(15, 23, 42, 0.3)', 
              borderRight: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column'
           }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                 <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Semantic Matches
                 </h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                 {!navResult && !isSearching && (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#475569' }}>
                       <Search size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                       <p style={{ fontSize: '0.85rem' }}>Enter a query above to find code matches.</p>
                    </div>
                 )}
                 {navResult && (
                    <div 
                      onClick={() => loadFile(navResult.file_path, navResult.start_line)}
                      style={{
                        padding: '1rem 1.5rem',
                        background: currentFile === navResult.file_path ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        borderLeft: currentFile === navResult.file_path ? '3px solid #6366f1' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                       <div style={{ color: '#6366f1', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Best Match</div>
                       <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: '600' }}>{navResult.file_path.split('/').pop()}</div>
                       <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{navResult.file_path}</div>
                       {navResult.function_name && (
                          <div style={{ marginTop: '8px', padding: '4px 8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '4px', fontSize: '0.7rem', color: '#c7d2fe', width: 'fit-content' }}>
                             func: {navResult.function_name}
                          </div>
                       )}
                    </div>
                 )}
                 {alternatives.map((alt, i) => (
                    <div 
                      key={i}
                      onClick={() => loadFile(alt.file_path, alt.start_line)}
                      style={{
                        padding: '1rem 1.5rem',
                        background: currentFile === alt.file_path ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                        borderLeft: currentFile === alt.file_path ? '3px solid #334155' : '3px solid transparent',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                       <div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{alt.file_path.split('/').pop()}</div>
                       <div style={{ color: '#475569', fontSize: '0.75rem' }}>{alt.file_path}</div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Middle: Monaco Editor (Entire File) */}
           <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'rgba(15, 23, 42, 0.2)', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                 <FileCode size={16} color="#6366f1" />
                 <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '500' }}>{currentFile || 'Select a match...'}</span>
              </div>
              <div style={{ flex: 1 }}>
                 <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={fileContent}
                    onMount={handleEditorDidMount}
                    options={{
                       fontSize: 14,
                       minimap: { enabled: true },
                       readOnly: true,
                       lineNumbers: 'on',
                       scrollBeyondLastLine: false,
                       automaticLayout: true,
                       padding: { top: 20 },
                       selectionHighlight: true,
                       occurrencesHighlight: true,
                       renderLineHighlight: 'all'
                    }}
                 />
              </div>
           </div>

           {/* Right: Insights & Graph */}
           <div style={{ background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Context Block */}
              {navResult && currentFile === navResult.file_path && (
                 <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                       <Bot size={18} color="#6366f1" />
                       <h4 style={{ color: '#f1f5f9', fontWeight: '600' }}>AI Reasoning</h4>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>
                       Found high semantic overlap for your query in <strong>{navResult.function_name || 'this module'}</strong>. 
                       This section manages the core logic related to your search intent.
                    </p>
                 </div>
              )}

              {/* Graph Preview */}
              <div style={{ flex: 1, position: 'relative' }}>
                 <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'rgba(15, 23, 42, 0.6)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
                    Visual Context Map
                 </div>
                 <ReactFlow nodes={nodes} edges={edges} fitView>
                    <Background color="#334155" gap={16} />
                    <Controls />
                 </ReactFlow>
              </div>

           </div>

        </div>

      </main>
    </div>
  );
}
