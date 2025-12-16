import { TrendingUp, Shield, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';

// Theme hook
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem("dreampath:theme") !== "light";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setDarkMode(localStorage.getItem("dreampath:theme") !== "light");
    };
    window.addEventListener("dreampath-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("dreampath-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  return darkMode;
};

const VALUE_PROPS: Record<
  'growth' | 'security' | 'creativity',
  {
    title: string;
    description: string;
    icon: typeof Lightbulb;
    lightColor: string;
    darkColor: string;
    iconColor: string;
  }
> = {
  growth: {
    title: '성장 지향',
    description: '도전과 발전을 최우선으로 생각합니다.',
    icon: TrendingUp,
    lightColor: 'bg-emerald-500/5 border-emerald-500/20',
    darkColor: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  security: {
    title: '안정성',
    description: '안정적인 환경과 신뢰를 중시합니다.',
    icon: Shield,
    lightColor: 'bg-[#5A7BFF]/5 border-[#5A7BFF]/20',
    darkColor: 'bg-[#5A7BFF]/10 border-[#5A7BFF]/20',
    iconColor: 'text-[#5A7BFF]',
  },
  creativity: {
    title: '창의성',
    description: '새로운 아이디어를 시도하고 표현합니다.',
    icon: Lightbulb,
    lightColor: 'bg-[#8F5CFF]/5 border-[#8F5CFF]/20',
    darkColor: 'bg-[#8F5CFF]/10 border-[#8F5CFF]/20',
    iconColor: 'text-[#8F5CFF]',
  },
};

interface ValueDetailCardProps {
  type: string;
  score?: number | string | null;
}

const ValueDetailCard = ({ type, score }: ValueDetailCardProps) => {
  const darkMode = useDarkMode();

  const config = VALUE_PROPS[type as keyof typeof VALUE_PROPS] || {
    title: type,
    description: '다양한 가치가 균형 있게 나타납니다.',
    icon: Lightbulb,
    lightColor: 'bg-gray-50 border-gray-100',
    darkColor: 'bg-white/[0.03] border-white/10',
    iconColor: 'text-gray-500',
  };
  const Icon = config.icon;
  const percent = Math.round((Number(score) || 0) * 100);

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
      darkMode ? config.darkColor : config.lightColor
    }`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2 shadow-sm ${
          darkMode ? 'bg-white/10' : 'bg-white/80'
        }`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${
            darkMode ? 'text-white/50' : 'text-gray-500'
          }`}>{config.title}</p>
          <p className={`text-base sm:text-lg font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>{percent}% 집중도</p>
        </div>
      </div>
      <p className={`mt-3 text-xs sm:text-sm ${
        darkMode ? 'text-white/60' : 'text-gray-600'
      }`}>{config.description}</p>
    </div>
  );
};

export default ValueDetailCard;