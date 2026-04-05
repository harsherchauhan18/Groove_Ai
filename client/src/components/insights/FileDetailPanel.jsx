import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { 
  X, 
  FileCode, 
  Info,
  Clock,
  Zap,
  Code,
  Layout,
  CheckCircle2,
  AlertCircle,
  Activity,
  Bot
} from 'lucide-react';
import useInsightsStore from '../../store/useInsightsStore';

export default function FileDetailPanel({ onClose, repoId }) {
  const { selectedFile, fileInsight } = useInsightsStore();
  const { loading, summary, preview, loc, complexity, lastModified, error } = fileInsight;

  if (!selectedFile) return null;

  return (
    <AnimatePresence>
       <motion.div 
         initial={{ x: '100%', opacity: 0.5 }}
         animate={{ x: 0, opacity: 1 }}
         exit={{ x: '100%', opacity: 0.5 }}
         transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
         style={{
           position: 'fixed',
           right: 0,
           top: 0,
           bottom: 0,
           width: '550px',
           background: 'rgba(10, 15, 25, 0.95)',
           borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
           backdropFilter: 'blur(30px)',
           zIndex: 1000,
           display: 'flex',
           flexDirection: 'column',
           color: '#f1f5f9',
           boxShadow: '-30px 0 60px rgba(0,0,0,0.6)'
         }}
       >
         {/* Top Navigation */}
         <div style={{ 
            padding: '1.5rem 2rem', 
            background: 'rgba(15, 23, 42, 0.4)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
         }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                  <FileCode size={20} color="#6366f1" />
               </div>
               <div>
                  <h3 style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', marginBottom: '2px' }}>
                    {selectedFile.split('/').pop()}
                  </h3>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>{selectedFile}</div>
               </div>
            </div>
            <button 
               onClick={onClose} 
               style={{ 
                 background: 'rgba(255,255,255,0.05)', 
                 border: 'none', 
                 color: '#94a3b8', 
                 cursor: 'pointer',
                 width: '32px',
                 height: '32px',
                 borderRadius: '8px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center'
               }}
            >
              <X size={18}/>
            </button>
         </div>

         {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
               <Activity size={32} className="spin" color="#6366f1" />
               <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Analyzing file with Deep Reasoning...</p>
            </div>
         ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
               
               {/* Metrics Row */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <MetricCard icon={<Zap size={16} color="#f59e0b" />} label="Avg Complexity" value={complexity} subtitle="Cyclomatic density" />
                  <MetricCard icon={<Code size={16} color="#3b82f6" />} label="Line Count" value={loc} subtitle="Total source lines" />
               </div>

               {/* AI Intelligence Card */}
               <div style={{ marginBottom: '2.5rem' }}>
                  <SectionLabel icon={<Bot size={16} />} text="AI Structural Summary" color="#10b981" />
                  <div style={{ 
                    background: 'rgba(16, 185, 129, 0.05)', 
                    border: '1px solid rgba(16, 185, 129, 0.1)', 
                    borderLeft: '4px solid #10b981', 
                    padding: '1.5rem', 
                    borderRadius: '4px 16px 16px 4px' 
                  }}>
                     <p style={{ color: '#cbd5e1', lineHeight: '1.8', fontSize: '0.95rem' }}>{summary}</p>
                  </div>
               </div>

               {/* Code Preview Pane */}
               <div style={{ marginBottom: '2.5rem' }}>
                  <SectionLabel icon={<Layout size={16} />} text="File Composition" />
                  <div style={{ height: '240px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        theme="vs-dark"
                        value={preview}
                        options={{
                           fontSize: 12,
                           minimap: { enabled: false },
                           readOnly: true,
                           lineNumbers: 'on',
                           scrollBeyondLastLine: false,
                           automaticLayout: true,
                           padding: { top: 10 }
                        }}
                     />
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                     Showing first 50 lines for structural preview.
                  </div>
               </div>

               {/* File Context & Modifiers */}
               <div>
                  <SectionLabel icon={<Clock size={16} />} text="File History" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                     <HistoryItem label="Last Modified" value={lastModified} />
                     <HistoryItem label="Primary Contributor" value="Maintainer (Core)" />
                     <HistoryItem label="Impact Vector" value="High Stability Required" />
                  </div>
               </div>

            </div>
         )}
       </motion.div>
    </AnimatePresence>
  );
}

function SectionLabel({ icon, text, color = "#6366f1" }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginBottom: '1.25rem' }}>
       <span style={{ color }}>{icon}</span> {text}
    </div>
  );
}

function MetricCard({ icon, label, value, subtitle }) {
  return (
    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '14px' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.75rem', marginBottom: '6px' }}>{icon} {label}</div>
       <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{value}</div>
       <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{subtitle}</div>
    </div>
  );
}

function HistoryItem({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
       <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{label}</span>
       <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: '500' }}>{value}</span>
    </div>
  );
}
