import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  GitCommit, 
  Users, 
  Code 
} from 'lucide-react';

export default function InsightsCharts({ timeline, authors, languages }) {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
       
       {/* Commit Activity Timeline */}
       <ChartPanel title="Commit Activity" icon={<GitCommit size={16} color="#6366f1" />}>
          <div style={{ height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                   <defs>
                      <linearGradient id="colorCommit" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <XAxis dataKey="date" hide />
                   <YAxis hide />
                   <Tooltip 
                      contentStyle={{ background: '#0b1120', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}
                      itemStyle={{ color: '#6366f1' }}
                   />
                   <Area type="monotone" dataKey="commits" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCommit)" dot={false} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
       </ChartPanel>

       {/* Contributor Distribution */}
       <ChartPanel title="Author Activity" icon={<Users size={16} color="#10b981" />}>
          <div style={{ height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={authors.slice(0, 10)}>
                   <XAxis dataKey="name" hide />
                   <YAxis hide />
                   <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ background: '#0b1120', border: 'none', borderRadius: '8px', fontSize: '0.8rem' }}
                   />
                   <Bar dataKey="commits" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
             </ResponsiveContainer>
          </div>
       </ChartPanel>

       {/* Language Distribution */}
       {languages.length > 0 && (
         <ChartPanel title="Repository Stack" icon={<Code size={16} color="#3b82f6" />}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ width: '250px', height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie 
                          data={languages} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={90} 
                          paddingAngle={5} 
                          dataKey="value"
                        >
                           {languages.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                           ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0b1120', border: 'none', borderRadius: '8px', fontSize: '0.8rem' }} />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </ChartPanel>
       )}

       {/* Detailed Contributor Cards */}
       {authors.length > 0 && (
         <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <h4 style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Users size={16} color="#10b981" /> Top Contributors
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
               {authors.slice(0, 4).map((author, i) => (
                  <motion.div 
                     key={i}
                     whileHover={{ y: -5 }}
                     style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '1.25rem',
                        padding: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem'
                     }}
                  >
                     <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, transparent)`, 
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#fff'
                     }}>
                        {author.name[0]}
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '1rem' }}>{author.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{author.commits} commits contribution</div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                           <div style={{ width: `${Math.min((author.commits/authors[0].commits)*100, 100)}%`, height: '100%', background: COLORS[i % COLORS.length] }} />
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>
       )}

    </div>
  );
}

function ChartPanel({ title, icon, children }) {
  return (
    <motion.div 
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       className="chart-panel" 
       style={{
         background: 'rgba(15, 23, 42, 0.4)',
         border: '1px solid rgba(255, 255, 255, 0.05)',
         borderRadius: '1.5rem',
         padding: '2rem',
         backdropFilter: 'blur(10px)'
       }}
    >
       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
          {icon} <h4 style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</h4>
       </div>
       {children}
    </motion.div>
  );
}
