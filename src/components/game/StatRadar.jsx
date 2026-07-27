import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card.jsx';

export default function StatRadar({ stats = [], loading = false, error = null, empty = false }) {
  const hasData = Array.isArray(stats) && stats?.length > 0;

  return (
    <Card empty={empty || !hasData} emptyText="No stat data recorded yet." error={error} loading={loading} title="Stats">
      <div className="h-72 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <RadarChart data={stats}>
            <PolarGrid stroke="rgba(255,255,255,0.12)" />
            <PolarAngleAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Radar dataKey="value" fill="#8b5cf6" fillOpacity={0.32} stroke="#f0c040" strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
