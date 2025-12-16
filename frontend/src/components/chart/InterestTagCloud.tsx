type InterestTagCloudProps = {
  interests: Array<{ label: string; weight?: number }> | string[];
  title?: string;
};

const palette = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-purple-100 text-purple-700 border-purple-200',
];

const normalizeInterests = (
  interests: InterestTagCloudProps['interests']
): Array<{ label: string; weight: number }> => {
  if (!interests || interests.length === 0) return [];

  return interests.map((item) =>
    typeof item === 'string' ? { label: item, weight: 1 } : { label: item.label, weight: item.weight ?? 1 }
  );
};

export default function InterestTagCloud({
  interests,
  title = '관심 분야',
}: InterestTagCloudProps) {
  const normalized = normalizeInterests(interests);

  if (normalized.length === 0) {
    return (
      <div className="w-full min-h-[180px] flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl bg-white text-gray-500">
        <i className="ri-price-tag-3-line text-3xl mb-2" />
        <p className="text-sm">표시할 관심 분야가 없습니다.</p>
      </div>
    );
  }

  const maxWeight = Math.max(...normalized.map((item) => item.weight || 1));

  return (
    <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#5A7BFF] font-semibold">
            Interest Cloud
          </p>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <span className="text-sm text-gray-500">{normalized.length} tags</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {normalized.map((item, index) => {
          const intensity = item.weight / maxWeight || 0.2;
          const scale = 0.95 + intensity * 0.1;
          const paletteClass = palette[index % palette.length];

          return (
            <span
              key={`${item.label}-${index}`}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-transform duration-200 ${paletteClass}`}
              style={{ transform: `scale(${scale})` }}
            >
              {item.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
