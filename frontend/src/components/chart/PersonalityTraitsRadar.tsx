import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

type TraitScore = {
  trait: string;
  score: number;
};

type PersonalityTraitsRadarProps = {
  data: TraitScore[];
  maxScore?: number;
};

/**
 * 성격 특성별 점수를 레이더 차트로 시각화한다.
 * traits 배열이 비어 있으면 빈 상태 메시지를 출력한다.
 */
export default function PersonalityTraitsRadar({
  data,
  maxScore = 100,
}: PersonalityTraitsRadarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-200 rounded-2xl bg-white">
        <i className="ri-radar-line text-3xl mb-2" />
        <p className="text-sm">아직 분석된 성격 특성이 없습니다.</p>
      </div>
    );
  }

  const normalized = data.map((item) => ({
    trait: item.trait,
    score: Math.min(Math.max(item.score, 0), maxScore),
  }));

  return (
    <div className="w-full h-80 bg-white rounded-3xl border border-gray-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold">
            Personality Radar
          </p>
          <h3 className="text-xl font-bold text-gray-900">성격 특성 강도</h3>
        </div>
        <span className="text-sm text-gray-500">최대 {maxScore}점 기준</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={normalized} outerRadius="70%">
          <PolarGrid stroke="#E5E7EB" strokeDasharray="4 4" />
          <PolarAngleAxis
            dataKey="trait"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={false}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, maxScore]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickCount={5}
          />
          <Tooltip
            formatter={(value: number) => [`${value}점`, 'Score']}
            contentStyle={{ borderRadius: 12, borderColor: '#E0E7FF' }}
          />
          <Radar
            name="성격 특성"
            dataKey="score"
            stroke="#6366F1"
            fill="url(#radarGradient)"
            fillOpacity={0.6}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.3} />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
