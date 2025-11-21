type ConfidenceProgressProps = {
  score: number;
  max?: number;
  label?: string;
};

export default function ConfidenceProgress({
  score,
  max = 100,
  label = '확신도',
}: ConfidenceProgressProps) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(score, max)) : 0;
  const percentage = Math.round((safeScore / max) * 100);

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-400 font-semibold">Confidence</p>
          <h3 className="text-xl font-bold text-gray-900">{label}</h3>
        </div>
        <span className="text-lg font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        현재 확신도는 {safeScore}/{max} 입니다.
      </p>
    </div>
  );
}
