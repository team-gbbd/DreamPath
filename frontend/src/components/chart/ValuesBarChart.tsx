import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ValueItem = {
  label: string;
  score: number;
};

type ValuesBarChartProps = {
  data: ValueItem[];
  maxScore?: number;
  title?: string;
};

/**
 * 가치관 정보를 막대차트로 표시한다.
 */
export default function ValuesBarChart({
  data,
  maxScore = 100,
  title = '가치관 우선순위',
}: ValuesBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-200 rounded-2xl bg-white">
        <i className="ri-bar-chart-2-line text-3xl mb-2" />
        <p className="text-sm">표시할 가치관 데이터가 없습니다.</p>
      </div>
    );
  }

  const normalized = data.map((item) => ({
    label: item.label,
    score: Math.min(Math.max(item.score, 0), maxScore),
  }));

  return (
    <div className="w-full h-80 bg-white rounded-3xl border border-gray-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 font-semibold">
            Values Insight
          </p>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <span className="text-sm text-gray-500">최대 {maxScore}점 기준</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={normalized} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, maxScore]}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value}점`, 'Score']}
            contentStyle={{ borderRadius: 12, borderColor: '#DCFCE7' }}
          />
          <Bar
            dataKey="score"
            fill="url(#valuesGradient)"
            radius={[8, 8, 4, 4]}
            barSize={32}
            animationDuration={900}
          />
          <defs>
            <linearGradient id="valuesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
