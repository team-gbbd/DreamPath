import React, { useEffect, useState } from 'react';
import type { JobDetailData, MajorDetailData } from '@/lib/api';
import { formatWageText } from '@/utils/formatWageText';
import { CompetencyBarChart, TabButton } from './JobDetailComponents';
import type { CompetencyItem } from './JobDetailComponents';

interface DetailModalProps {
  type: 'job' | 'major';
  open: boolean;
  onClose: () => void;
  detailData?: JobDetailData | MajorDetailData | null;
  fallback?: any;
  loading?: boolean;
  errorMessage?: string | null;
}

type GenericRecord = Record<string, any>;

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

const ModalOverlay = ({
  children,
  className = '',
  darkMode = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { darkMode?: boolean }) => (
  <div
    {...rest}
    className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-2 sm:p-4 ${darkMode ? 'bg-black/70' : 'bg-black/50'} ${className}`}
  >
    {children}
  </div>
);

const ModalContainer = ({
  children,
  className = '',
  darkMode = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { darkMode?: boolean }) => (
  <div
    role="dialog"
    aria-modal="true"
    {...rest}
    className={`relative flex w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border ${darkMode ? 'bg-[#0f0f14] border-white/10' : 'bg-white border-gray-200'} ${className}`}
  >
    {children}
  </div>
);

const SectionTitle = ({ children, darkMode = false }: { children: React.ReactNode; darkMode?: boolean }) => (
  <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
    <span className="h-5 sm:h-6 w-1 rounded-full bg-gradient-to-b from-[#5A7BFF] to-[#8F5CFF] block"></span>
    {children}
  </h3>
);

const cleanText = (value: string) =>
  value.replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim();

const toText = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const cleaned = cleanText(value);
    return cleaned || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
};

const toPercentText = (value: unknown): string | null => {
  const text = toText(value);
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return `${match[1]}%`;
  }
  return text.replace(/\s+%/g, '%');
};

// ... existing helper functions (toList, splitLines, toRecordList, mergeText) kept simple or inlined if trivial ...
const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  return [];
};

const splitLines = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/[\n\r]+/)
    .map((line) => cleanText(line))
    .filter(Boolean);
};

const EmptyState = ({ message, darkMode = false }: { message: string; darkMode?: boolean }) => (
  <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${darkMode
      ? 'border-white/20 bg-white/[0.03] text-white/50'
      : 'border-gray-200 bg-gray-50 text-gray-400'
    }`}>
    {message}
  </div>
);

export default function DetailModal({
  type,
  open,
  onClose,
  detailData,
  fallback,
  loading,
  errorMessage
}: DetailModalProps) {
  const darkMode = useDarkMode();
  const isJob = type === 'job';
  const [activeTab, setActiveTab] = useState(0);

  // Theme styles
  const theme = {
    bg: darkMode ? 'bg-[#0f0f14]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSecondary: darkMode ? 'text-white/70' : 'text-gray-700',
    textMuted: darkMode ? 'text-white/50' : 'text-gray-500',
    border: darkMode ? 'border-white/10' : 'border-gray-100',
    cardBg: darkMode ? 'bg-white/[0.03]' : 'bg-gray-50',
    infoBg: darkMode ? 'bg-[#5A7BFF]/10' : 'bg-indigo-50',
    infoText: darkMode ? 'text-[#5A7BFF]' : 'text-indigo-500',
    footerBg: darkMode ? 'bg-white/[0.02]' : 'bg-gray-50',
    closeBtn: darkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700',
    tabBg: darkMode ? 'bg-[#0f0f14]' : 'bg-white',
    tabBorder: darkMode ? 'border-white/10' : 'border-gray-200',
  };

  useEffect(() => {
    if (!open) {
      setActiveTab(0);
      return;
    }

    const maxIndex = isJob ? 2 : 2;
    setActiveTab((prev) => (prev > maxIndex ? 0 : prev));
  }, [open, isJob]);

  if (!open) {
    return null;
  }

  // --------------------------------------------------------------------------
  // Data Parsing
  // --------------------------------------------------------------------------
  const jobDetail = isJob ? (detailData as JobDetailData | null) : null;
  const majorDetail = !isJob ? (detailData as MajorDetailData | null) : null;
  const rawData = (jobDetail?.rawData || majorDetail?.rawData || {}) as GenericRecord;
  const baseInfo = (rawData.baseInfo || rawData.baseinfo || {}) as GenericRecord;

  const fallbackData = (!isJob && fallback && typeof fallback === 'object')
    ? (fallback as GenericRecord)
    : {};

  // Extract fallback metadata from recommendation item (for fields not in rawData)
  const fallbackMetadata = (!isJob && fallback && typeof fallback === 'object' && 'metadata' in fallback)
    ? (fallback.metadata as Record<string, any> || {})
    : {};

  console.log('=== DetailModal Data Debug ===');
  console.log('fallback:', fallback);
  console.log('fallbackMetadata:', fallbackMetadata);
  console.log('fallbackMetadata.lClass:', fallbackMetadata.lClass);

  // Title & Header Info
  const title = toText(
    baseInfo.job_nm || baseInfo.jobName || rawData.job_nm || rawData.jobName ||
    majorDetail?.majorName || rawData.major || rawData.majorName ||
    fallback?.title || fallback?.jobName || '이름 미확인'
  );

  const category = toText(baseInfo.job_ctg_nm || rawData.lClass || fallback?.category || '분류 미확인');

  // --------------------------------------------------------------------------
  // Tabs Configuration
  // --------------------------------------------------------------------------
  const tabs = isJob
    ? ['직업개요', '직업탐색 및 준비', '지식/업무']
    : ['학과개요', '통계'];

  // --------------------------------------------------------------------------
  // Content Rendering (JOB)
  // --------------------------------------------------------------------------

  // Tab 0: Overview
  const renderJobOverview = () => {
    const summary = toText(jobDetail?.summary || rawData.summary || fallback?.explanation);
    const wage = formatWageText(jobDetail?.wageText || rawData.wage || baseInfo.wage);
    // Prospect data is in forecastList array
    const forecastList = rawData.forecastList || [];
    const prospect = toText(Array.isArray(forecastList) && forecastList.length > 0 ? forecastList[0].forecast : null);
    const aptitude = toText(jobDetail?.aptitudeText || baseInfo.aptit_name || rawData.aptitude);
    const similarJobs = toText(rawData.similarJob || baseInfo.rel_job_nm);

    // Additional fields
    const workList = rawData.workList || [];
    const interestList = rawData.interestList || [];
    const aptitudeList = rawData.aptitudeList || [];
    // Parse certifications (same logic as in Prep tab)
    const parseList = (jsonOrString: any, key: string) => {
      if (!jsonOrString) return [];
      if (Array.isArray(jsonOrString)) return jsonOrString.map(i => i[key] || i.name || i).filter(Boolean);
      try {
        const parsed = JSON.parse(jsonOrString);
        return parsed.map((i: any) => i[key] || i.name || i).filter(Boolean);
      } catch {
        return [];
      }
    };
    const certs = parseList(rawData.certiList, 'certi');
    const majors = parseList(rawData.departList, 'depart_name');

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <section>
          <SectionTitle darkMode={darkMode}>직업 설명</SectionTitle>
          <div className={`rounded-2xl border p-6 text-base leading-relaxed ${darkMode
              ? 'border-white/10 bg-white/[0.03] text-white/80'
              : 'border-gray-100 bg-gray-50 text-gray-700'
            }`}>
            {summary || <EmptyState message="직업 설명 정보가 없습니다." darkMode={darkMode} />}
          </div>
        </section>

        {/* Work List - 주요 업무 */}
        {workList.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>주요 업무</SectionTitle>
            <div className="space-y-3">
              {workList.map((item: any, i: number) => (
                <div key={i} className={`flex gap-3 rounded-xl px-4 py-3 ${darkMode ? 'bg-white/[0.03]' : 'bg-gray-50'
                  }`}>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-[#5A7BFF]/20 text-[#5A7BFF]' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                    {i + 1}
                  </div>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>{item.work}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle darkMode={darkMode}>핵심 정보</SectionTitle>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-indigo-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-[#5A7BFF]' : 'text-indigo-500'}`}>평균 연봉</p>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{wage || '-'}</p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-indigo-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-[#5A7BFF]' : 'text-indigo-500'}`}>관련 학과</p>
              <p className={`text-sm font-bold line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {majors.length > 0 ? majors.join(', ') : '-'}
              </p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-indigo-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-[#5A7BFF]' : 'text-indigo-500'}`}>관련 직업</p>
              <p className={`text-sm font-bold line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{similarJobs || '-'}</p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-indigo-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-[#5A7BFF]' : 'text-indigo-500'}`}>관련 자격증</p>
              <p className={`text-sm font-bold line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {certs.length > 0 ? certs.join(', ') : '-'}
              </p>
            </div>
          </div>
        </section>

        {/* Job Prospect - Full Text */}
        {prospect && (
          <section>
            <SectionTitle darkMode={darkMode}>일자리 전망</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode
                ? 'border-white/10 bg-gradient-to-br from-[#5A7BFF]/10 to-[#8F5CFF]/10'
                : 'border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50'
              }`}>
              <p className={`text-base leading-relaxed ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>{prospect}</p>
            </div>
          </section>
        )}

        {/* Aptitude List - 상세 적성 */}
        {aptitudeList.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>필요 적성 (상세)</SectionTitle>
            <div className="space-y-2">
              {aptitudeList.map((item: any, i: number) => (
                <div key={i} className={`rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-blue-500/10 text-white/70' : 'bg-blue-50 text-gray-700'
                  }`}>
                  • {item.aptitude}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Interest List */}
        {interestList.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>어울리는 성향</SectionTitle>
            <div className="space-y-2">
              {interestList.map((item: any, i: number) => (
                <div key={i} className={`rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-green-500/10 text-white/70' : 'bg-green-50 text-gray-700'
                  }`}>
                  • {item.interest}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  // Tab 1: Preparation (Training, Certification, Majors)
  const renderJobPrep = () => {
    // jobReadyList contains training info
    const jobReady = rawData.jobReadyList || {};
    const trainings = Array.isArray(jobReady.training)
      ? jobReady.training.map((t: any) => t.training).filter(Boolean)
      : [];

    // Additional fields
    const researchList = rawData.researchList || [];
    const eduChart = rawData.eduChart || [];
    const majorChart = rawData.majorChart || [];
    const jobRelOrgList = rawData.jobRelOrgList || [];
    const relVideoList = rawData.relVideoList || [];

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {trainings.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>교육 및 훈련</SectionTitle>
            <div className="space-y-2">
              {trainings.map((t: string, i: number) => (
                <div key={i} className={`rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-white/[0.03] text-white/70' : 'bg-gray-50 text-gray-700'
                  }`}>
                  • {t}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Research List - 탐색 방법 */}
        {researchList.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>직업 탐색 방법</SectionTitle>
            <div className="space-y-2">
              {researchList.map((item: any, i: number) => (
                <div key={i} className={`rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-purple-500/10 text-white/70' : 'bg-purple-50 text-gray-700'
                  }`}>
                  • {item.research}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education Chart */}
        {eduChart.length > 0 && eduChart[0].chart_data && (
          <section>
            <SectionTitle darkMode={darkMode}>학력 분포</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
              }`}>
              {(() => {
                const labels = eduChart[0].chart_name?.split(',') || [];
                const values = eduChart[0].chart_data?.split(',').map(Number) || [];
                return (
                  <div className="space-y-3">
                    {labels.map((label: string, i: number) => (
                      values[i] > 0 && (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-sm w-24 ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>{label}</span>
                          <div className={`flex-1 h-8 rounded-lg overflow-hidden ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-end pr-2"
                              style={{ width: `${values[i]}%` }}
                            >
                              <span className="text-xs font-bold text-white">{values[i]}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                    <p className={`text-xs mt-2 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>{eduChart[0].source}</p>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* Major Chart */}
        {majorChart.length > 0 && majorChart[0].major_data && (
          <section>
            <SectionTitle darkMode={darkMode}>전공 계열 분포</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
              }`}>
              {(() => {
                const labels = majorChart[0].major?.split(',') || [];
                const values = majorChart[0].major_data?.split(',').map(Number) || [];
                return (
                  <div className="space-y-3">
                    {labels.map((label: string, i: number) => (
                      values[i] > 0 && (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-sm w-24 ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>{label}</span>
                          <div className={`flex-1 h-8 rounded-lg overflow-hidden ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-end pr-2"
                              style={{ width: `${values[i]}%` }}
                            >
                              <span className="text-xs font-bold text-white">{values[i]}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                    <p className={`text-xs mt-2 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>{majorChart[0].source}</p>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* Related Organizations */}
        {jobRelOrgList.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>관련 기관</SectionTitle>
            <div className="space-y-3">
              {jobRelOrgList.map((org: any, i: number) => {
                // Add http:// prefix if URL doesn't start with http/https
                let url = org.rel_org_url;
                if (url && !url.startsWith('http')) {
                  url = 'http://' + url;
                }
                const hasValidUrl = !!url;

                return hasValidUrl ? (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition group ${darkMode
                        ? 'bg-white/[0.03] hover:bg-[#5A7BFF]/10'
                        : 'bg-gray-50 hover:bg-indigo-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-indigo-100'
                        }`}>
                        <i className={`ri-building-line ${darkMode ? 'text-[#5A7BFF]' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{org.rel_org}</p>
                        <p className={`text-xs transition ${darkMode
                            ? 'text-white/50 group-hover:text-[#5A7BFF]'
                            : 'text-gray-500 group-hover:text-indigo-600'
                          }`}>{org.rel_org_url}</p>
                      </div>
                    </div>
                    <i className={`ri-external-link-line transition ${darkMode
                        ? 'text-white/40 group-hover:text-[#5A7BFF]'
                        : 'text-gray-400 group-hover:text-indigo-600'
                      }`} />
                  </a>
                ) : (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-white/[0.03]' : 'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-200'
                        }`}>
                        <i className={`ri-building-line ${darkMode ? 'text-white/50' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>{org.rel_org}</p>
                        <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>URL 정보 없음</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={`text-xs mt-3 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
              일부 기관의 웹사이트 주소가 변경되었거나 접속이 불가능할 수 있습니다.
            </p>
          </section>
        )}

        {/* Related Videos */}
        {relVideoList.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>관련 영상</SectionTitle>
            <div className="grid md:grid-cols-2 gap-4">
              {relVideoList.slice(0, 4).map((video: any, i: number) => (
                <a
                  key={i}
                  href={video.OUTPATH3}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group rounded-xl border overflow-hidden hover:shadow-lg transition ${darkMode ? 'border-white/10' : 'border-gray-200'
                    }`}
                >
                  <div className={`aspect-video relative overflow-hidden flex items-center justify-center ${darkMode
                      ? 'bg-gradient-to-br from-[#5A7BFF]/20 to-[#8F5CFF]/20'
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                    }`}>
                    {video.THUMNAIL_PATH ? (
                      <>
                        <img
                          src={`https://cdn.career.go.kr/cnet/real/upload/${video.THUMNAIL_PATH}`}
                          alt={video.video_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className={`absolute inset-0 flex items-center justify-center ${darkMode
                            ? 'bg-gradient-to-br from-[#5A7BFF]/20 to-[#8F5CFF]/20'
                            : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                          }`}>
                          <i className={`ri-video-line text-6xl ${darkMode ? 'text-[#5A7BFF]/50' : 'text-indigo-300'}`} />
                        </div>
                      </>
                    ) : (
                      <i className={`ri-video-line text-6xl ${darkMode ? 'text-[#5A7BFF]/50' : 'text-indigo-300'}`} />
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <i className="ri-play-circle-line text-4xl text-white" />
                    </div>
                  </div>
                  <div className={`p-3 ${darkMode ? 'bg-white/[0.03]' : 'bg-white'}`}>
                    <p className={`text-sm font-medium line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{video.video_name}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };



  // Tab 3: Competency (Bars)
  const renderJobCompetency = () => {
    // Database stores competency data in performList object with nested arrays
    const performList = rawData.performList || {};
    const perform = performList.perform as CompetencyItem[];
    const knowledge = performList.knowledge as CompetencyItem[];

    return (
      <div className="space-y-12 animate-in fade-in duration-300">
        <section>
          <SectionTitle darkMode={darkMode}>중요 지식 (Knowledge)</SectionTitle>
          <div className={`rounded-3xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
            }`}>
            <CompetencyBarChart data={knowledge || []} type="knowledge" darkMode={darkMode} />
          </div>
        </section>

        <section>
          <SectionTitle darkMode={darkMode}>주요 업무 수행 (Performance)</SectionTitle>
          <div className={`rounded-3xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
            }`}>
            <CompetencyBarChart data={perform || []} type="perform" darkMode={darkMode} />
          </div>
        </section>
      </div>
    );
  };


  // --------------------------------------------------------------------------
  // Content Rendering (MAJOR)
  // --------------------------------------------------------------------------

  // Tab 0: 학과개요 (Overview)
  const renderMajorOverview = () => {
    console.log('=== Major Overview Debug ===');
    console.log('majorDetail:', majorDetail);
    console.log('rawData:', rawData);
    console.log('rawData.lClass:', rawData.lClass);
    console.log('fallbackMetadata.lClass:', fallbackMetadata.lClass);

    const summary = toText(majorDetail?.summary || rawData.summary || rawData.major_summary);
    const characteristics = toText(rawData.characteristics || rawData.property || majorDetail?.propertyText);
    const interest = toText(majorDetail?.interest || rawData.interest);
    const relatedJobList = Array.isArray(rawData.relatedJobs)
      ? (rawData.relatedJobs as Array<GenericRecord>)
        .map((item) => toText(item?.relate_JOB_NAME ?? item?.job ?? item))
        .filter(Boolean) as string[]
      : splitLines(
        majorDetail?.job ??
        fallbackMetadata?.relatedJobs ??
        fallbackMetadata?.job ??
        fallbackData?.relatedJob
      );

    // Try rawData first, then fallback to metadata from recommendation item
    const lClass = rawData.lClass || rawData.lclass || rawData.l_class ||
      rawData.LCLASS || rawData.L_CLASS ||
      fallbackMetadata.lClass || '분류 미확인';

    console.log('Extracted lClass:', lClass);

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <section>
          <SectionTitle darkMode={darkMode}>학과 설명</SectionTitle>
          <div className={`rounded-2xl border p-6 text-base leading-relaxed ${darkMode
              ? 'border-white/10 bg-white/[0.03] text-white/80'
              : 'border-gray-100 bg-gray-50 text-gray-700'
            }`}>
            {summary || <EmptyState message="학과 설명 정보가 없습니다." darkMode={darkMode} />}
          </div>
        </section>

        {characteristics && (
          <section>
            <SectionTitle darkMode={darkMode}>학과 특성</SectionTitle>
            <div className={`rounded-2xl border p-6 text-base leading-relaxed ${darkMode
                ? 'border-white/10 bg-purple-500/10 text-white/80'
                : 'border-gray-100 bg-purple-50 text-gray-700'
              }`}>
              {characteristics}
            </div>
          </section>
        )}

        {interest && (
          <section>
            <SectionTitle darkMode={darkMode}>흥미와 적성</SectionTitle>
            <div className={`rounded-2xl border p-6 text-base leading-relaxed ${darkMode
                ? 'border-white/10 bg-gradient-to-br from-[#5A7BFF]/10 to-[#8F5CFF]/10 text-white/80'
                : 'border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-700'
              }`}>
              {interest}
            </div>
          </section>
        )}

        <section>
          <SectionTitle darkMode={darkMode}>핵심 정보</SectionTitle>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-indigo-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-[#5A7BFF]' : 'text-indigo-500'}`}>계열</p>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{lClass}</p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-green-400' : 'text-green-500'}`}>취업률</p>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {toPercentText(majorDetail?.employment || rawData.employment) || '-'}
              </p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>관련 직업</p>
              <p className={`text-sm font-bold line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {relatedJobList.length > 0 ? relatedJobList.join(', ') : '-'}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  // Tab 1: 개설대학 및 통계 (Universities & Statistics)
  const renderMajorStatistics = () => {
    // Debug: Log the actual data structure
    console.log('=== Major Statistics Debug ===');
    console.log('rawData:', rawData);
    console.log('rawData.chartData:', rawData.chartData);

    // Parse chartData - handle both object and array formats
    let chartDataDict: Record<string, any> = {};
    const chartDataSrc = rawData.chartData;

    if (chartDataSrc) {
      if (typeof chartDataSrc === 'object' && !Array.isArray(chartDataSrc)) {
        chartDataDict = chartDataSrc;
      } else if (Array.isArray(chartDataSrc)) {
        // Merge array of objects into single dict
        chartDataSrc.forEach((item: any) => {
          if (typeof item === 'object') {
            Object.assign(chartDataDict, item);
          }
        });
      }
    }

    console.log('chartDataDict:', chartDataDict);

    const genderData = Array.isArray(chartDataDict.gender) ? chartDataDict.gender : [];
    const fieldData = Array.isArray(chartDataDict.field) ? chartDataDict.field : [];
    const employmentData = Array.isArray(chartDataDict.employment_rate) ? chartDataDict.employment_rate : [];
    const graduationData = Array.isArray(chartDataDict.after_graduation) ? chartDataDict.after_graduation : [];
    const salaryData = Array.isArray(chartDataDict.avg_salary) ? chartDataDict.avg_salary : [];

    console.log('genderData:', genderData);
    console.log('fieldData:', fieldData);
    console.log('employmentData:', employmentData);
    console.log('graduationData:', graduationData);
    console.log('salaryData:', salaryData);

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Gender Distribution Chart */}
        {genderData.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>성별 분포</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
              }`}>
              <div className="space-y-3">
                {genderData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-sm w-20 ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>{item.item}</span>
                    <div className={`flex-1 h-10 rounded-lg overflow-hidden ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] flex items-center justify-end pr-3"
                        style={{ width: `${item.data}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.data}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Field Distribution Chart */}
        {fieldData.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>계열 분포</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
              }`}>
              <div className="space-y-3">
                {fieldData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-sm w-32 truncate ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>{item.item}</span>
                    <div className={`flex-1 h-10 rounded-lg overflow-hidden ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-600 flex items-center justify-end pr-3"
                        style={{ width: `${item.data}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.data}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Employment Rate Chart */}
        {employmentData.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>취업률</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
              }`}>
              <div className="space-y-3">
                {employmentData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-sm w-24 ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>{item.item}</span>
                    <div className={`flex-1 h-10 rounded-lg overflow-hidden ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-600 flex items-center justify-end pr-3"
                        style={{ width: `${item.data}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.data}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Graduation Path Chart */}
        {graduationData.length > 0 && (
          <section>
            <SectionTitle darkMode={darkMode}>졸업 후 진로</SectionTitle>
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-white'
              }`}>
              <div className="space-y-3">
                {graduationData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-sm w-24 ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>{item.item}</span>
                    <div className={`flex-1 h-10 rounded-lg overflow-hidden ${darkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-red-600 flex items-center justify-end pr-3"
                        style={{ width: `${item.data}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.data}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {genderData.length === 0 && fieldData.length === 0 &&
          employmentData.length === 0 && graduationData.length === 0 && salaryData.length === 0 && (
            <EmptyState message="통계 데이터가 없습니다." darkMode={darkMode} />
          )}
      </div>
    );
  };


  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------
  if (!open) return null;

  return (
    <ModalOverlay darkMode={darkMode} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer darkMode={darkMode} className="h-[85vh] sm:h-[85vh]">
        {/* Header */}
        <header className={`flex-none flex items-start justify-between border-b px-4 sm:px-8 py-4 sm:py-6 z-10 ${theme.border} ${theme.bg}`}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className={`text-xl sm:text-3xl font-extrabold truncate ${theme.text}`}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            className={`rounded-full p-2 transition flex-shrink-0 ${theme.closeBtn}`}
          >
            <i className="ri-close-line text-xl sm:text-2xl" />
          </button>
        </header>

        {/* Tab Navigation (Sticky) */}
        <div className={`flex-none flex border-b px-4 sm:px-8 overflow-x-auto ${theme.tabBorder} ${theme.tabBg}`}>
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === idx
                  ? darkMode
                    ? 'border-[#5A7BFF] text-[#5A7BFF]'
                    : 'border-indigo-600 text-indigo-600'
                  : darkMode
                    ? 'border-transparent text-white/50 hover:text-white/80'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Scroll Area */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-8 custom-scroll ${theme.bg}`}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className={`h-8 w-8 animate-spin rounded-full border-4 border-t-transparent ${darkMode ? 'border-[#5A7BFF]' : 'border-indigo-500'}`} />
            </div>
          ) : isJob ? (
            <>
              {activeTab === 0 && renderJobOverview()}
              {activeTab === 1 && renderJobPrep()}
              {activeTab === 2 && renderJobCompetency()}
            </>
          ) : (
            <>
              {activeTab === 0 && renderMajorOverview()}
              {activeTab === 1 && renderMajorStatistics()}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className={`flex-none border-t px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-1 text-xs ${theme.border} ${theme.footerBg} ${theme.textMuted}`}>
          <p>Data Source: CareerNet (2025 Updated)</p>
          <p>DreamPath AI Analysis</p>
        </footer>

      </ModalContainer>
    </ModalOverlay>
  );
}
