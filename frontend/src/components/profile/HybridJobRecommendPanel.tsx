import { useMemo, useState, useEffect } from "react";
import { ImageOff } from "lucide-react";
import { fetchJobDetail, type JobDetailData } from "@/lib/api";
import DetailModal from "@/pages/profile/DetailModal";
import { getJobImage } from "@/utils/imageHelpers";

interface HybridResultItem {
  job_id?: string;
  title?: string;
  reason?: string;
  explanation?: string;
  description?: string;
  matchScore?: number;
  match?: number;
  score?: number;
  metadata?: Record<string, any>;
  [key: string]: unknown;
}

interface HybridJobRecommendPanelProps {
  embedded?: boolean;
  jobs?: any[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

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

// Utility for formatting wage
const formatWageText = (value?: string | number | null): string | null => {
  if (!value) return null;
  const text = String(value).trim();

  // If explicitly 0 or empty
  if (text === '0' || text === '') return null;

  // If already Korean format (e.g. "4000만원")
  if (text.includes('만') || text.includes('천')) return text;

  // Try parsing number
  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num) || num === 0) return text;

  // Simple formatting for raw numbers (assuming db stores in man-won or won?) 
  // CareerNet usually stores text like "4000만원 이상".
  // If it's just "4000", treat as man-won.
  if (num >= 1000) {
    return `${Math.round(num / 1000)}천만원`; // 4000 -> 4천만원
  }
  return `${num}만원`;
};

const HybridJobRecommendPanel = ({ embedded = false, jobs = [], isLoading = false, errorMessage = null }: HybridJobRecommendPanelProps) => {
  const darkMode = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<HybridResultItem | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Theme styles
  const theme = {
    cardBg: darkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-gray-100",
    cardHover: darkMode ? "hover:border-[#5A7BFF] hover:bg-white/[0.06]" : "hover:border-indigo-500 hover:shadow-xl",
    cardSelected: darkMode ? "border-[#5A7BFF] ring-2 ring-[#5A7BFF]/20" : "border-indigo-600 ring-2 ring-indigo-100",
    text: darkMode ? "text-white" : "text-gray-900",
    textSecondary: darkMode ? "text-white/70" : "text-gray-700",
    textMuted: darkMode ? "text-white/50" : "text-gray-500",
    statBorder: darkMode ? "border-white/[0.08]" : "border-gray-100",
    imageBg: darkMode ? "bg-white/[0.05] border-white/[0.1]" : "bg-gray-100 border-gray-100",
    explanationBg: darkMode ? "bg-[#5A7BFF]/10 border border-[#5A7BFF]/20" : "bg-gray-50",
    loadingBg: darkMode ? "bg-white/[0.05]" : "bg-gray-50",
    emptyBorder: darkMode ? "border-white/[0.1]" : "border-gray-200",
    emptyText: darkMode ? "text-white/50" : "text-gray-500",
    badge: darkMode ? "bg-[#5A7BFF]/20 text-[#5A7BFF]" : "bg-indigo-50 text-indigo-600",
    titleHover: darkMode ? "group-hover:text-[#5A7BFF]" : "group-hover:text-indigo-600",
    accent: darkMode ? "text-[#5A7BFF]" : "text-indigo-500",
  };

  // Filter Results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter((item) => {
      const title = item.title || item.jobName || item.metadata?.jobName || "제목 미확인";
      const tag = item.tag || item.category || item.metadata?.job_category || "";
      return title.toLowerCase().includes(query) || tag.toLowerCase().includes(query);
    });
  }, [jobs, searchQuery]);

  const hasResults = filteredResults.length > 0;

  const resolveJobId = (item: HybridResultItem): string | number | null => {
    const metadata = (item?.metadata ?? {}) as Record<string, any>;
    let id = (
      item.id ||
      item.job_id ||
      metadata?.job_id ||
      metadata?.jobId ||
      metadata?.original_id ||
      metadata?.job_code ||
      null
    );

    if (typeof id === 'string' && id.startsWith('job_')) {
      id = id.replace('job_', '');
    }

    return id;
  };

  const handleCardClick = async (item: HybridResultItem) => {
    setSelectedJob(item);
    setJobDetail(null);
    setDetailError(null);
    const jobId = resolveJobId(item);
    if (!jobId) {
      setDetailError("직업 ID가 없어 상세 데이터를 불러올 수 없습니다.");
      return;
    }
    try {
      setDetailLoading(true);
      const detail = await fetchJobDetail(jobId);
      setJobDetail(detail);
    } catch (error: any) {
      const message =
        error?.response?.status === 404
          ? "상세 직업 데이터를 찾을 수 없습니다."
          : "직업 상세 데이터를 불러오지 못했습니다.";
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedJob(null);
    setJobDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleImageError = (key: string) => {
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  const wrapperClass = embedded ? "space-y-6" : "space-y-8";

  return (
    <div className={wrapperClass}>
      {(isLoading || errorMessage) && (
        <div className={`rounded-xl p-4 mb-4 ${theme.loadingBg}`}>
          {isLoading && (
            <div className={`flex items-center gap-2 ${theme.accent}`}>
              <div className={`h-4 w-4 animate-spin rounded-full border-2 ${darkMode ? 'border-[#5A7BFF] border-t-transparent' : 'border-blue-600 border-t-transparent'}`}></div>
              <p className={`text-sm font-medium ${theme.textSecondary}`}>
                추천 결과를 불러오는 중입니다...
              </p>
            </div>
          )}
          {errorMessage && (
            <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
          )}
        </div>
      )}

      {/* Search Bar */}

      {!isLoading && !hasResults && (
        <div className={`rounded-2xl border border-dashed p-6 sm:p-10 text-center ${theme.emptyBorder} ${theme.emptyText}`}>
          추천 결과가 여기에 표시됩니다.
        </div>
      )}

      {hasResults && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredResults.map((item, index) => {
            const title = item.title || item.jobName || item.metadata?.jobName || "제목 미확인";
            const explanation = item.explanation || item.reason || item.description || "추천 이유가 준비 중입니다.";

            // Stats Extraction Helper
            const parseMetadata = (item: HybridResultItem) => {
              if (item.metadata && typeof item.metadata === 'object') return item.metadata;
              if (item.metadata_json) {
                try {
                  return typeof item.metadata_json === 'string'
                    ? JSON.parse(item.metadata_json)
                    : item.metadata_json;
                } catch {
                  return {};
                }
              }
              return {};
            };

            const metadata = parseMetadata(item);
            const rawWage = metadata.wage || metadata.salary;
            const wage = formatWageText(rawWage) || "정보 없음";
            const wlb = metadata.wlb || metadata.workLifeBalance || "정보 없음";
            const imageKey = String(item.job_id || item.metadata?.job_id || index);
            const rawCategory = item.metadata?.job_category || item.category || item.tag || "";
            const jobCategoryName = typeof rawCategory === "string" ? rawCategory : "";

            // Allow empty category to fall back to default image
            const jobImageUrl = !imageErrors[imageKey]
              ? getJobImage(jobCategoryName, title)
              : "";

            return (
              <div
                key={`job-${item.job_id || 'unknown'}-${index}`}
                role="button"
                className={`group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border p-4 sm:p-6 transition-all cursor-pointer ${theme.cardBg} ${theme.cardHover} ${selectedJob === item ? theme.cardSelected : ""}`}
                onClick={() => handleCardClick(item)}
              >
                {/* Header: Title & Match Score */}
                <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
                  <h3 className={`text-lg sm:text-2xl font-bold ${theme.text} ${theme.titleHover} transition-colors line-clamp-2`}>
                    {title}
                  </h3>
                  {(item.matchScore !== undefined || item.match) && (
                    <span className={`inline-flex items-center rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold flex-shrink-0 ${theme.badge}`}>
                      {Math.round(item.matchScore ?? item.match ?? 0)}%
                    </span>
                  )}
                </div>

                {/* Body: Image + Stats */}
                <div className="flex gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {/* Career Image */}
                  <div className={`w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl sm:rounded-2xl relative overflow-hidden border flex items-center justify-center ${theme.imageBg}`}>
                    {jobImageUrl ? (
                      <img
                        src={jobImageUrl}
                        alt={`${title} 추천 이미지`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={() => handleImageError(imageKey)}
                      />
                    ) : (
                      <div className={`flex flex-col items-center ${theme.textMuted}`}>
                        <ImageOff size={24} className="mb-1 opacity-60 sm:hidden" />
                        <ImageOff size={30} className="mb-1 opacity-60 hidden sm:block" />
                        <span className="text-[10px] sm:text-xs font-medium">사진 없음</span>
                      </div>
                    )}
                  </div>

                  {/* Stats List */}
                  <div className="flex-1 space-y-2 sm:space-y-3 py-1">
                    <div className={`border-b pb-2 last:border-0 last:pb-0 ${theme.statBorder}`}>
                      <p className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${theme.textMuted}`}>평균연봉</p>
                      <p className={`text-sm sm:text-base font-bold ${theme.text}`}>{wage}</p>
                    </div>
                    <div className={`border-b pb-2 last:border-0 last:pb-0 ${theme.statBorder}`}>
                      <p className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${theme.textMuted}`}>일가정균형</p>
                      <p className={`text-sm sm:text-base font-bold ${theme.text}`}>{wlb}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom: Explanation */}
                <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed ${theme.explanationBg} ${theme.textSecondary}`}>
                  <span className={`font-bold block mb-1 ${theme.accent}`}>💡 AI 추천 이유</span>
                  <span className="line-clamp-3">{explanation}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <DetailModal
          type="job"
          open={Boolean(selectedJob)}
          onClose={closeModal}
          detailData={jobDetail}
          fallback={selectedJob}
          loading={detailLoading}
          errorMessage={detailError}
        />
      )}
    </div>
  );
};

export default HybridJobRecommendPanel;
