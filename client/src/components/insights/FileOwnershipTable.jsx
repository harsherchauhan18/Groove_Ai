import React from 'react';
import { User, FileText, GitCommit } from 'lucide-react';
import useInsightsStore from '../../store/useInsightsStore';

export default function FileOwnershipTable() {
  const { owners } = useInsightsStore(state => state.insights);

  if (!owners || owners.length === 0) return (
    <div style={{ color: '#475569', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
       Analyzing file-level accountability...
    </div>
  );

  return (
    <div className="ownership-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
       <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', fontSize: '0.85rem' }}>
          <thead>
             <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px', fontWeight: '600', color: '#94a3b8' }}>File Path</th>
                <th style={{ padding: '12px 8px', fontWeight: '600', color: '#94a3b8' }}>Owner</th>
                <th style={{ padding: '12px 8px', fontWeight: '600', color: '#94a3b8', textAlign: 'right' }}>Edits</th>
             </tr>
          </thead>
          <tbody>
             {owners.slice(0, 10).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', hover: { background: 'rgba(255,255,255,0.02)' } }}>
                   <td style={{ padding: '12px 8px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span title={row.file_path}>{row.file_path.split('/').pop()}</span>
                      <div style={{ fontSize: '0.7rem', color: '#475569' }}>{row.file_path}</div>
                   </td>
                   <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                            {row.owner.charAt(0)}
                         </div>
                         {row.owner}
                      </div>
                   </td>
                   <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#6366f1' }}>
                      {row.commits}
                   </td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
}
