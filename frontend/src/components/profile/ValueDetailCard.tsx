import { TrendingUp, Shield, Lightbulb } from 'lucide-react';

const VALUE_PROPS: Record<
  'growth' | 'security' | 'creativity',
  {
    title: string;
    description: string;
    icon: typeof Lightbulb;
    color: string;
  }
> = {
  growth: {
    title: '성장 지향',
    description: '도전과 발전을 최우선으로 생각합니다.',
    icon: TrendingUp,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  security: {
    title: '안정성',
    description: '안정적인 환경과 신뢰를 중시합니다.',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  },
  creativity: {
    title: '창의성',
    description: '새로운 아이디어를 시도하고 표현합니다.',
    icon: Lightbulb,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
  },
};

interface ValueDetailCardProps {
  type: string;
  score?: number | string | null;
}

const ValueDetailCard = ({ type, score }: ValueDetailCardProps) => {
  const config = VALUE_PROPS[type as keyof typeof VALUE_PROPS] || {
    title: type,
    description: '다양한 가치가 균형 있게 나타납니다.',
    icon: Lightbulb,
    color: 'text-gray-600 bg-gray-50 border-gray-100',
  };
  const Icon = config.icon;
  const percent = Math.round((Number(score) || 0) * 100);

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${config.color}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white/80 p-2 shadow">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{config.title}</p>
          <p className="text-lg font-bold text-gray-900">{percent}% 집중도</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600">{config.description}</p>
    </div>
  );
};

export default ValueDetailCard;
