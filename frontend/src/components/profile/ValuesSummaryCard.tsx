import { Fragment, useMemo } from 'react';
import { Sparkles } from 'lucide-react';

const VALUES_LABELS: Record<string, string> = {
  creativity: '창의성',
  growth: '성장 지향',
  security: '안정성',
  leadership: '리더십',
  collaboration: '협업',
  passion: '열정',
};

interface ValuesSummaryCardProps {
  valuesJSON?: string | Record<string, unknown> | null;
}

type ValueSummary = {
  key: string;
  label: string;
  score: number;
};

const ValuesSummaryCard = ({ valuesJSON }: ValuesSummaryCardProps) => {
  const topValues = useMemo<ValueSummary[]>(() => {
    if (!valuesJSON) return [];
    try {
      const parsed =
        typeof valuesJSON === 'string' ? (JSON.parse(valuesJSON) as Record<string, unknown>) : valuesJSON;
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, value]) => ({
          key,
          label: VALUES_LABELS[key] || key,
          score: Number(value) || 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    } catch {
      return [];
    }
  }, [valuesJSON]);

  if (!topValues.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <Sparkles className="h-5 w-5" />
          <p className="text-sm">가치관 데이터가 충분하지 않습니다.</p>
        </div>
      </div>
    );
  }

  const first = topValues[0];
  const description = [
    `${first.label}이 가장 두드러집니다.`,
    topValues[1] ? `${topValues[1].label}과 ${topValues[2]?.label ?? '다른 가치'}도 함께 나타납니다.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 shadow-lg shadow-amber-100/40">
      <div className="flex items-center gap-3 text-amber-700">
        <div className="rounded-full bg-white/70 p-2">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            핵심 가치
          </p>
          <p className="text-lg font-bold text-amber-900">{first.label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-amber-900/80">{description}</p>
      <div className="mt-4 grid gap-3 text-sm">
        {topValues.map((value, idx) => (
          <Fragment key={value.key}>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="font-medium text-gray-700">{idx + 1}위 {value.label}</span>
              <span className="text-gray-500">{(value.score * 100).toFixed(0)}%</span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default ValuesSummaryCard;
