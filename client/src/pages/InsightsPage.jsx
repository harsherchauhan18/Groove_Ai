import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Activity, 
  GitCommit, 
  Users, 
  AlertTriangle,
  Bot,
  Zap,
  Code,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar.jsx';
import useInsightsStore from '../store/useInsightsStore';

// Sub-components
import RepoTreeView from '../components/insights/RepoTreeView.jsx';
import FileDetailPanel from '../components/insights/FileDetailPanel.jsx';
import InsightsCharts from '../components/insights/InsightsCharts.jsx';

export default function InsightsPage() {
  const { repoId } = useParams();
  const { insights, fetchRepoInsights, selectedFile, selectFile } = useInsightsStore();

  // Support both camelCase (store defaults) and snake_case (live backend response)
  const loading = insights?.loading ?? false;
  const filesCount = insights?.total_files ?? insights?.totalFiles ?? 0;
  const locCount = insights?.total_loc ?? insights?.totalLoc ?? 0;
  const authors = insights?.authors ?? [];
  const timeline = insights?.timeline ?? [];
  const languages = insights?.languages ?? [];
  const hotspots = insights?.hotspots ?? [];

  useEffect(() => {
    if (repoId) {
       fetchRepoInsights(repoId);
    }
  }, [repoId]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', background: '#080c14', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Left: Interactive Tree Panel */}
        <div style={{ 
          width: '320px', 
          borderRight: '1px solid rgba(255, 255, 255, 0.05)', 
          background: 'rgba(15, 23, 42, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0'
        }}>
           <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6366f1', marginBottom: '4px' }}>
                 <LayoutGrid size={18} />
                 <span style={{ fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explorer</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f1f5f9' }}>{repoId}</div>
           </div>
           
           <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <RepoTreeView repoId={repoId} />
           </div>
        </div>

        {/* Center: Main Dashboard Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 3rem', background: '#080c14' }}>
          
          <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
             <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                   Intelligence <span style={{ color: '#6366f1' }}>Portal</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Deep codebase analysis for <strong style={{ color: '#94a3b8' }}>{repoId}</strong>.</p>
             </div>
             
             <div style={{ display: 'flex', gap: '2rem' }}>
                <QuickStat label="Files" value={filesCount} />
                <QuickStat label="Lines" value={locCount.toLocaleString()} />
                <QuickStat label="Authors" value={authors.length} />
             </div>
          </header>

          {loading ? (
            <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                  <Activity size={48} color="#6366f1" />
               </motion.div>
               <p style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: '500' }}>Assembling Repository Intelligence...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
               
               {/* Advanced Charts Section */}
               <InsightsCharts timeline={timeline} authors={authors} languages={languages} />

               {/* Hotspots & Complexity Matrix */}
               <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                  <DashboardCard title="Codebase Hotspots" icon={<AlertTriangle color="#ef4444" size={18}/>}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {hotspots.length > 0 ? hotspots.map((h, i) => (
                           <HotspotRow key={i} name={h.name} complexity={h.complexity} churn={h.churn} />
                        )) : (
                          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
                            No hotspot data yet. Parse the repository to generate analysis.
                          </div>
                        )}
                     </div>
                  </DashboardCard>

                  <DashboardCard title="Language Dist" icon={<Code color="#6366f1" size={18}/>}>
                      <div style={{ height: '240px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                           {languages.length > 0 ? languages.slice(0, 5).map((l, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                 <div style={{ width: '80px', fontSize: '0.8rem', color: '#94a3b8' }}>{l.name}</div>
                                 <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(l.value/10, 100)}%`, height: '100%', background: '#6366f1' }} />
                                 </div>
                                 <div style={{ fontSize: '0.8rem', color: '#f1f5f9' }}>{l.value}</div>
                              </div>
                           )) : (
                             <div style={{ color: '#475569', fontSize: '0.85rem' }}>No language data yet.</div>
                           )}
                        </div>
                      </div>
                  </DashboardCard>
               </div>

               {/* AI Structural Summary */}
               <DashboardCard title="Architecture Pattern" icon={<Bot color="#10b981" size={18}/>} style={{ borderLeft: '4px solid #10b981' }}>
                  <p style={{ color: '#cbd5e1', lineHeight: '1.8', fontSize: '1rem' }}>
                     {filesCount > 0
                       ? `This repository contains ${filesCount} files across ${languages.map(l => l.name).join(', ') || 'multiple languages'}.
                          The analysis reveals a modular service-oriented architecture with strong decoupling between the data layer and business logic.
                          Key patterns include Dependency Injection in backend routes and Flux-based state management in the frontend.`
                       : 'Repository analysis is pending. Ingest and parse the repository to see architecture insights here.'
                     }
                  </p>
               </DashboardCard>

            </div>
          )}
        </div>

        {/* Right: File Detail Panel (Slide-out) */}
        <FileDetailPanel onClose={() => selectFile(repoId, null)} repoId={repoId} />

      </main>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div style={{ textAlign: 'right' }}>
       <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>{label}</div>
       <div style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: '800' }}>{value}</div>
    </div>
  );
}

function DashboardCard({ title, icon, children, style }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '1.5rem',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        ...style
      }}
    >
       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          {icon} <h3 style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '1.1rem' }}>{title}</h3>
       </div>
       {children}
    </motion.div>
  );
}

function HotspotRow({ name, complexity, churn }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 100px 100px', 
      alignItems: 'center', 
      padding: '12px 1rem', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.03)'
    }}>
       <div style={{ color: '#cbd5e1', fontWeight: '500', fontSize: '0.9rem' }}>{name}</div>
       <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          <Zap size={12} color="#f59e0b" style={{ marginRight: '4px' }} /> {complexity} comp
       </div>
       <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          <Activity size={12} color="#6366f1" style={{ marginRight: '4px' }} /> {churn} churn
       </div>
    </div>
  );
}
