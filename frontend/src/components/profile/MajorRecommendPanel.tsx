import { useMemo, useState } from "react";
import { fetchMajorDetail } from "@/lib/api";
import type { MajorDetailData } from "@/lib/api";
import DetailModal from "@/pages/profile/DetailModal";
import { ImageOff } from "lucide-react"; // Assuming lucide-react is available, otherwise use similar icon
import { getMajorImage } from "@/utils/imageHelpers";

interface RecommendItem {
  id?: string | number;
  major_id?: string | number;
  title?: string;
  name?: string;
  majorName?: string;
  metadata?: Record<string, any>;
  score?: number;
  matchScore?: number;
  match?: number; // Added for compatibility
  reason?: string;
  explanation?: string;
  description?: string;
  tag?: string; // Added for compatibility
  category?: string; // Added for compatibility
  major_name?: string; // Added for compatibility
}

interface Props {
  embedded?: boolean;
  majors?: any[];
  isLoading?: boolean;
  errorMessage?: string | null;
}



const MajorRecommendPanel = ({ embedded = false, majors = [], isLoading = false, errorMessage = null }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<RecommendItem | null>(null);
  const [majorDetail, setMajorDetail] = useState<MajorDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [useFallbackImage, setUseFallbackImage] = useState<Record<string, boolean>>({});

  // Local Filtering Logic (No API call)
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

    // Normalize string ID if needed (e.g. major_1234 -> 1234)
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
    // If already using fallback, mark as final error
    if (useFallbackImage[key]) {
      setImageErrors((prev) => ({ ...prev, [key]: true }));
    } else {
      // Try fallback to index 1
      setUseFallbackImage((prev) => ({ ...prev, [key]: true }));
    }
  };

  return (
    <div className={wrapperClass}>
      {(isLoading || errorMessage) && (
        <div className="rounded-xl bg-gray-50 p-4 mb-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium">추천 데이터를 불러오는 중입니다...</p>
            </div>
          )}
          {errorMessage && <p className="text-sm text-red-500 mt-2">{errorMessage}</p>}
        </div>
      )}

      {/* Search Bar */}

      {!hasItems && !isLoading && !errorMessage && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
          추천 결과가 여기에 표시됩니다.
        </div>
      )}

      {hasItems && (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item, index) => {
            const title = item.title || item.name || item.majorName || item.major_name || item.metadata?.deptName || "학과명 미확인";
            const explanation = item.explanation || item.reason || item.description || "추천 이유가 준비 중입니다.";

            // Badges
            const field = item.metadata?.lClass || "계열 미확인";
            const badges = ["대학교", field]; // Implicitly assuming University type as per standard data

            // Stats
            // Backend now provides pre-calculated rates
            const empRate = item.metadata?.employment_rate || "정보 없음";
            const advRate = item.metadata?.advancement_rate || "정보 없음";
            const imageKey = String(item.id || item.major_id || index);
            const rawCategory = item.metadata?.lClass || item.metadata?.field || item.tag || item.category || "";
            const majorCategoryName = typeof rawCategory === "string" ? rawCategory : "";

            let majorImageUrl = "";
            if (!imageErrors[imageKey]) {
              if (useFallbackImage[imageKey]) {
                // Fallback: Use index 1 of the resolved category (re-resolving to be safe)
                // Note: In real app, we might want to export default images constants
                // For now, simpler to just let getMajorImage handle it but likely getting same slug.
                // We need to force asking for index 1.
                // Hack: appending special char or just manually constructing if possible.
                // Actually clearer way: define a helper or just trust getMajorImage but changing input name to alter hash?
                // Better: Let's manually construct a safe URL if possible or just use a known safe public URL?
                // Let's rely on name change to force new hash index.
                majorImageUrl = getMajorImage(majorCategoryName, title + "_fallback");
              } else {
                majorImageUrl = getMajorImage(majorCategoryName, title);
              }
            }

            return (
              <div
                key={item.id || item.major_id || index}
                role="button"
                className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all hover:border-indigo-500 hover:shadow-xl ${selectedMajor === item ? "border-indigo-600 ring-2 ring-indigo-100" : "border-gray-100"
                  }`}
                onClick={() => handleCardClick(item)}
              >
                {/* Header: Title & Badges & Match Score */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {title}
                    </h3>
                  </div>
                  {(item.match || item.matchScore) && (
                    <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-600 whitespace-nowrap">
                      {item.match || item.matchScore}% 일치
                    </div>
                  )}
                </div>

                {/* Body: Image + Badges + Stats */}
                <div className="flex gap-6 mb-6">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-2xl bg-gray-100 text-gray-400 relative overflow-hidden border border-gray-200 flex items-center justify-center">
                    {majorImageUrl ? (
                      <img
                        src={majorImageUrl}
                        alt={`${title} 학과 이미지`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={() => handleImageError(imageKey)}
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageOff size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-medium">사진 없음</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Badges & Stats */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {badges.map((b, i) => (
                        <span key={i} className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${b === '대학교' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {b}
                        </span>
                      ))}
                    </div>

                    {/* Stats List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-sm font-bold text-gray-900">진학률</span>
                        <span className="text-sm font-medium text-gray-900">{advRate}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-sm font-bold text-gray-900">취업률</span>
                        <span className="text-sm font-medium text-gray-900">{empRate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                  <span className="font-bold text-indigo-500 block mb-1">💡 AI 추천 이유</span>
                  {explanation}
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
    </div >
  );
};

export default MajorRecommendPanel;
