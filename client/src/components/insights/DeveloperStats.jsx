import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line 
} from 'recharts';
import useInsightsStore from '../../store/useInsightsStore';

export default function DeveloperStats() {
  const { authors, timeline } = useInsightsStore(state => state.insights);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      {/* Commitment Distribution */}
      <div className="stats-card" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '1rem' }}>Developer Velocity</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={authors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="author" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Bar dataKey="commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="stats-card" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '1rem' }}>Repo Pulse (90 Days)</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" hide />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line type="monotone" dataKey="commits" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
