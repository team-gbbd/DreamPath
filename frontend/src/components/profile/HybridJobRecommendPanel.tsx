import { useMemo, useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<HybridResultItem | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
        <div className="rounded-xl bg-gray-50 p-4 mb-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium">
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
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
          추천 결과가 여기에 표시됩니다.
        </div>
      )}

      {hasResults && (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredResults.map((item, index) => {
            const title = item.title || item.jobName || item.metadata?.jobName || "제목 미확인";
            const explanation = item.explanation || item.reason || item.description || "추천 이유가 준비 중입니다.";

            // Stats Extraction
            const rawWage = item.metadata?.wage;
            const wage = formatWageText(rawWage) || "정보 없음";
            const wlb = item.metadata?.wlb || "정보 없음";
            const imageKey = String(item.job_id || item.metadata?.job_id || index);
            const rawCategory = item.metadata?.job_category || item.category || item.tag || "";
            const jobCategoryName = typeof rawCategory === "string" ? rawCategory : "";

            // Allow empty category to fall back to default image
            const jobImageUrl = !imageErrors[imageKey]
              ? getJobImage(jobCategoryName, title)
              : "";

            return (
              <div
                key={item.job_id || index}
                role="button"
                className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all hover:border-indigo-500 hover:shadow-xl ${selectedJob === item ? "border-indigo-600 ring-2 ring-indigo-100" : "border-gray-100"
                  }`}
                onClick={() => handleCardClick(item)}
              >
                {/* Header: Title & Match Score */}
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {title}
                  </h3>
                  {(item.matchScore !== undefined || item.match) && (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-600">
                      {Math.round(item.matchScore ?? item.match ?? 0)}% 일치
                    </span>
                  )}
                </div>

                {/* Body: Image + Stats */}
                <div className="flex gap-6 mb-6">
                  {/* Career Image */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-2xl bg-gray-100 text-gray-400 relative overflow-hidden border border-gray-100 flex items-center justify-center">
                    {jobImageUrl ? (
                      <img
                        src={jobImageUrl}
                        alt={`${title} 추천 이미지`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={() => handleImageError(imageKey)}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <ImageOff size={30} className="mb-1 opacity-60" />
                        <span className="text-xs font-medium">사진 없음</span>
                      </div>
                    )}
                  </div>

                  {/* Stats List */}
                  <div className="flex-1 space-y-3 py-1">
                    <div className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <p className="text-xs text-gray-500 mb-1">평균연봉</p>
                      <p className="text-base font-bold text-gray-900">{wage}</p>
                    </div>
                    <div className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <p className="text-xs text-gray-500 mb-1">일가정균형</p>
                      <p className="text-base font-bold text-gray-900">{wlb}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom: Explanation */}
                <div className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                  <span className="font-bold text-indigo-500 block mb-1">💡 AI 추천 이유</span>
                  {explanation}
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
