import { useMemo, useState, useEffect } from "react";
import { fetchMajorDetail } from "@/lib/api";
import type { MajorDetailData } from "@/lib/api";
import DetailModal from "@/pages/profile/DetailModal";
import { ImageOff } from "lucide-react";
import { getMajorImage } from "@/utils/imageHelpers";

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

interface RecommendItem {
  id?: string | number;
  major_id?: string | number;
  title?: string;
  name?: string;
  majorName?: string;
  metadata?: Record<string, any>;
  score?: number;
  matchScore?: number;
  match?: number;
  reason?: string;
  explanation?: string;
  description?: string;
  tag?: string;
  category?: string;
  major_name?: string;
}

interface Props {
  embedded?: boolean;
  majors?: any[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

const MajorRecommendPanel = ({ embedded = false, majors = [], isLoading = false, errorMessage = null }: Props) => {
  const darkMode = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<RecommendItem | null>(null);
  const [majorDetail, setMajorDetail] = useState<MajorDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [useFallbackImage, setUseFallbackImage] = useState<Record<string, boolean>>({});

  // Theme styles
  const theme = {
    cardBg: darkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-gray-100",
    cardHover: darkMode ? "hover:border-[#8F5CFF] hover:bg-white/[0.06]" : "hover:border-indigo-500 hover:shadow-xl",
    cardSelected: darkMode ? "border-[#8F5CFF] ring-2 ring-[#8F5CFF]/20" : "border-indigo-600 ring-2 ring-indigo-100",
    text: darkMode ? "text-white" : "text-gray-900",
    textSecondary: darkMode ? "text-white/70" : "text-gray-700",
    textMuted: darkMode ? "text-white/50" : "text-gray-500",
    statBorder: darkMode ? "border-white/[0.08]" : "border-gray-100",
    imageBg: darkMode ? "bg-white/[0.05] border-white/[0.1]" : "bg-gray-100 border-gray-200",
    explanationBg: darkMode ? "bg-[#8F5CFF]/10 border border-[#8F5CFF]/20" : "bg-gray-50",
    loadingBg: darkMode ? "bg-white/[0.05]" : "bg-gray-50",
    emptyBorder: darkMode ? "border-white/[0.1]" : "border-gray-200",
    emptyText: darkMode ? "text-white/50" : "text-gray-500",
    badge: darkMode ? "bg-[#8F5CFF]/20 text-[#8F5CFF]" : "bg-indigo-50 text-indigo-600",
    badgeBlue: darkMode ? "bg-[#5A7BFF]/20 text-[#5A7BFF]" : "bg-blue-100 text-blue-700",
    badgeGray: darkMode ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-600",
    titleHover: darkMode ? "group-hover:text-[#8F5CFF]" : "group-hover:text-indigo-600",
    accent: darkMode ? "text-[#8F5CFF]" : "text-indigo-500",
  };

  // Local Filtering Logic
  const items = useMemo(() => {
    if (!searchQuery.trim()) return majors;
    const query = searchQuery.toLowerCase();
    return majors.filter((item) => {
      const title = item.title || item.name || item.majorName || item.major_name || item.metadata?.deptName || "학과명 미확인";
      const tag = item.tag || item.category || item.metadata?.field || item.metadata?.lClass || "";
      return title.toLowerCase().includes(query) || tag.toLowerCase().includes(query);
    });
  }, [majors, searchQuery]);

  const hasItems = useMemo(() => items.length > 0, [items.length]);
  const wrapperClass = embedded ? "space-y-6" : "space-y-8";

  const resolveMajorId = (item: RecommendItem): string | number | null => {
    const metadata = (item?.metadata ?? {}) as Record<string, any>;
    let id = (
      item.id ||
      item.major_id ||
      metadata?.majorId ||
      metadata?.majorSeq ||
      metadata?.original_id ||
      metadata?.department_id ||
      null
    );

    if (typeof id === 'string' && id.startsWith('major_')) {
      id = id.replace('major_', '');
    }
    return id;
  };

  const handleCardClick = async (item: RecommendItem) => {
    setSelectedMajor(item);
    setMajorDetail(null);
    setDetailError(null);
    const majorId = resolveMajorId(item);
    if (!majorId) {
      setDetailError("학과 ID가 없어 상세 데이터를 불러올 수 없습니다.");
      return;
    }
    try {
      setDetailLoading(true);
      const detail = await fetchMajorDetail(majorId);
      setMajorDetail(detail);
    } catch (error: any) {
      const message =
        error?.response?.status === 404
          ? "상세 학과 데이터를 찾을 수 없습니다."
          : "학과 상세 데이터를 불러오지 못했습니다.";
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedMajor(null);
    setMajorDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleImageError = (key: string) => {
    if (useFallbackImage[key]) {
      setImageErrors((prev) => ({ ...prev, [key]: true }));
    } else {
      setUseFallbackImage((prev) => ({ ...prev, [key]: true }));
    }
  };

  return (
    <div className={wrapperClass}>
      {(isLoading || errorMessage) && (
        <div className={`rounded-xl p-4 mb-4 ${theme.loadingBg}`}>
          {isLoading && (
            <div className={`flex items-center gap-2 ${theme.accent}`}>
              <div className={`h-4 w-4 animate-spin rounded-full border-2 ${darkMode ? 'border-[#8F5CFF] border-t-transparent' : 'border-blue-600 border-t-transparent'}`}></div>
              <p className={`text-sm font-medium ${theme.textSecondary}`}>
                추천 데이터를 불러오는 중입니다...
              </p>
            </div>
          )}
          {errorMessage && <p className="text-sm text-red-500 mt-2">{errorMessage}</p>}
        </div>
      )}

      {!hasItems && !isLoading && !errorMessage && (
        <div className={`rounded-2xl border border-dashed p-6 sm:p-10 text-center ${theme.emptyBorder} ${theme.emptyText}`}>
          추천 결과가 여기에 표시됩니다.
        </div>
      )}

      {hasItems && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const title = item.title || item.name || item.majorName || item.major_name || item.metadata?.deptName || "학과명 미확인";
            const explanation = item.explanation || item.reason || item.description || "추천 이유가 준비 중입니다.";

            // Stats Extraction Helper
            const parseMetadata = (item: RecommendItem) => {
              if (item.metadata && typeof item.metadata === 'object') return item.metadata;
              if (item.metadata_json) {
                const jsonStr = (item as any).metadata_json;
                try {
                  return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                } catch { return {}; }
              }
              return {};
            };

            const metadata = parseMetadata(item as any);

            // Badges
            const field = metadata.lClass || metadata.field || item.metadata?.lClass || "계열 미확인";
            const badges = ["대학교", field];

            // Stats
            const empRate = metadata.employment_rate || metadata.employment || item.metadata?.employment_rate || "정보 없음";
            const advRate = metadata.advancement_rate || metadata.advancement || item.metadata?.advancement_rate || "정보 없음";
            const imageKey = String(item.id || item.major_id || index);
            const rawCategory = item.metadata?.lClass || item.metadata?.field || item.tag || item.category || "";
            const majorCategoryName = typeof rawCategory === "string" ? rawCategory : "";

            let majorImageUrl = "";
            if (!imageErrors[imageKey]) {
              if (useFallbackImage[imageKey]) {
                majorImageUrl = getMajorImage(majorCategoryName, title + "_fallback");
              } else {
                majorImageUrl = getMajorImage(majorCategoryName, title);
              }
            }

            return (
              <div
                key={item.id || item.major_id || index}
                role="button"
                className={`group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border p-4 sm:p-6 transition-all cursor-pointer ${theme.cardBg} ${theme.cardHover} ${selectedMajor === item ? theme.cardSelected : ""}`}
                onClick={() => handleCardClick(item)}
              >
                {/* Header: Title & Match Score */}
                <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
                  <h3 className={`text-lg sm:text-2xl font-bold ${theme.text} ${theme.titleHover} transition-colors line-clamp-2`}>
                    {title}
                  </h3>
                  {(item.match || item.matchScore) && (
                    <span className={`inline-flex items-center rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold flex-shrink-0 ${theme.badge}`}>
                      {item.match || item.matchScore}%
                    </span>
                  )}
                </div>

                {/* Body: Image + Badges + Stats */}
                <div className="flex gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {/* Image */}
                  <div className={`w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl sm:rounded-2xl relative overflow-hidden border flex items-center justify-center ${theme.imageBg}`}>
                    {majorImageUrl ? (
                      <img
                        src={majorImageUrl}
                        alt={`${title} 학과 이미지`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={() => handleImageError(imageKey)}
                      />
                    ) : (
                      <div className={`flex flex-col items-center ${theme.textMuted}`}>
                        <ImageOff size={24} className="mb-1 opacity-60 sm:hidden" />
                        <ImageOff size={32} className="mb-2 opacity-50 hidden sm:block" />
                        <span className="text-[10px] sm:text-xs font-medium">사진 없음</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Badges & Stats */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      {badges.map((b, i) => (
                        <span key={i} className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${b === '대학교' ? theme.badgeBlue : theme.badgeGray
                          }`}>
                          {b}
                        </span>
                      ))}
                    </div>

                    {/* Stats List */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className={`flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 ${theme.statBorder}`}>
                        <span className={`text-xs sm:text-sm font-bold ${theme.text}`}>진학률</span>
                        <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>{advRate}</span>
                      </div>
                      <div className={`flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 ${theme.statBorder}`}>
                        <span className={`text-xs sm:text-sm font-bold ${theme.text}`}>취업률</span>
                        <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>{empRate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed ${theme.explanationBg} ${theme.textSecondary}`}>
                  <span className={`font-bold block mb-1 ${theme.accent}`}>💡 AI 추천 이유</span>
                  <span className="line-clamp-3">{explanation}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMajor && (
        <DetailModal
          type="major"
          open={Boolean(selectedMajor)}
          onClose={closeModal}
          detailData={majorDetail}
          fallback={selectedMajor}
          loading={detailLoading}
          errorMessage={detailError}
        />
      )}
    </div>
  );
};

export default MajorRecommendPanel;