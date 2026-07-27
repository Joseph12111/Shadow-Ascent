import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';

const TOOLTIP_CONTENT_STYLE = {
  background: '#111118',
  border: '1px solid rgba(240,192,64,0.3)',
  borderRadius: '12px',
  color: '#ffffff',
};
const TOOLTIP_LABEL_STYLE = {
  color: '#ffffff',
  fontWeight: 700,
};
const TOOLTIP_ITEM_STYLE = {
  color: '#ffffff',
};

function getHeatColor(value) {
  if (value >= 4) {
    return '#f0c040';
  }

  if (value >= 2) {
    return '#8b5cf6';
  }

  if (value >= 1) {
    return 'rgba(139,92,246,0.45)';
  }

  return 'rgba(255,255,255,0.08)';
}

function buildScatterData(data) {
  return (data || []).map((day, index) => {
    const week = Math.floor(index / 7);
    const dayIndex = index % 7;
    const value = Number(day?.value || 0);

    return {
      x: week,
      y: 6 - dayIndex,
      z: 1,
      value,
      date: day?.date,
      fill: getHeatColor(value),
    };
  });
}

function HeatCell({ cx, cy, payload }) {
  const fill = payload?.fill || 'rgba(255,255,255,0.08)';
  return <rect x={cx - 9} y={cy - 9} width={18} height={18} rx={5} fill={fill} stroke="rgba(255,255,255,0.14)" />;
}

export default function HeatmapGrid({ data = [], loading = false, error = null, empty = false }) {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />;
  }

  if (error) {
    return <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">Heatmap unavailable.</div>;
  }

  if (empty || !data?.length) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textSecondary">No activity heatmap data yet.</div>;
  }

  const scatterData = buildScatterData(data);
  const weekCount = Math.max(6, Math.ceil((data?.length || 1) / 7));

  return (
    <div className="h-44 w-full rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <ResponsiveContainer height="100%" width="100%">
        <ScatterChart margin={{ top: 12, right: 8, bottom: 10, left: 8 }}>
          <XAxis dataKey="x" domain={[0, weekCount - 1]} hide type="number" />
          <YAxis dataKey="y" domain={[0, 6]} hide type="number" />
          <ZAxis dataKey="z" range={[70, 70]} type="number" />
          <Tooltip
            cursor={false}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            formatter={(value, name, entry) => [`${Number(entry?.payload?.value || 0)} activity`, entry?.payload?.date || '']}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelFormatter={() => ''}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          <Scatter data={scatterData} shape={<HeatCell />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
