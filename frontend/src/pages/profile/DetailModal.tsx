import React from 'react';
import { JobDetailData, MajorDetailData } from '@/lib/api';

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

const ModalOverlay = ({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...rest}
    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${className}`}
  >
    {children}
  </div>
);

const ModalContainer = ({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    role="dialog"
    aria-modal="true"
    {...rest}
    className={`relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${className}`}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold text-gray-900">{children}</h3>
);

const cleanText = (value: string) =>
  value.replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim();

export const formatWageText = (value?: string | null) => {
  const text = value ? cleanText(value) : '';
  if (!text) return null;
  const containsThousand = /천/.test(text);
  const containsHundredMillion = /억/.test(text);
  const numericString = text.replace(/[^\d]/g, '');
  if (!numericString) {
    return text;
  }
  let numericValue = parseInt(numericString, 10);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    return text;
  }
  if (containsHundredMillion) {
    numericValue *= 10000; // 1억 = 10,000만원
  } else if (containsThousand && numericValue < 1000) {
    numericValue *= 1000;
  }
  if (numericValue >= 1000) {
    const roundedThousands = Math.round(numericValue / 1000);
    return `${roundedThousands}천만원`;
  }
  return `${numericValue.toLocaleString()}만원`;
};

const toText = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const cleaned = cleanText(value);
    return cleaned || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => (typeof item === 'string' ? cleanText(item) : String(item ?? '')))
      .filter(Boolean)
      .join(', ');
    return joined || null;
  }
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>)
      .map((item) => (typeof item === 'string' ? cleanText(item) : String(item ?? '')))
      .filter(Boolean);
    return values.join(', ') || null;
  }
  return null;
};

const toList = (value: unknown, allowSingle = false): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => (typeof item === 'string' ? cleanText(item) : String(item ?? '')))
      .filter(Boolean);
    return arr.length > 1 || allowSingle ? arr : [];
  }
  if (typeof value === 'string') {
    const base = cleanText(value);
    if (!base) return [];
    const parts = base
      .split(/[\n\r]+|[·•]|,/)
      .map((part) => part.replace(/^[0-9.]+\s*/, '').trim())
      .filter(Boolean);
    if (parts.length > 1 || allowSingle) {
      return parts;
    }
    return [];
  }
  return [];
};

const splitLines = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/[\n\r]+/)
    .map((line) => cleanText(line))
    .filter(Boolean);
};

const toRecordList = (value?: Array<GenericRecord> | null, keys: string[] = ['name']) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      for (const key of keys) {
        const result = toText(item?.[key]);
        if (result) return result;
      }
      return null;
    })
    .filter(Boolean) as string[];
};

const mergeText = (values: Array<string | null | undefined>) => {
  const filtered = values.map((value) => (value ? cleanText(value) : '')).filter(Boolean);
  return filtered.length ? filtered.join(' / ') : null;
};

const getContent = (value: unknown, { allowListSingle = false } = {}) => {
  const list = toList(value, allowListSingle);
  if (list.length > 1 || (allowListSingle && list.length === 1)) {
    return { list, text: null };
  }
  return { list: [], text: toText(value) };
};

const TagPill = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="ml-1 text-gray-900">{value}</span>
    </span>
  );
};

const DetailCard = ({
  title,
  value,
  allowListSingle = false
}: {
  title: string;
  value: unknown;
  allowListSingle?: boolean;
}) => {
  const { text, list } = getContent(value, { allowListSingle });
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm shadow-indigo-100/40">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {list.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-gray-600">
          {list.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          {text || '관련 정보가 아직 제공되지 않았습니다.'}
        </p>
      )}
    </div>
  );
};

const DescriptionRow = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
    {children}
  </div>
);

const StatusBanner = ({
  loading,
  error
}: {
  loading?: boolean;
  error?: string | null;
}) => {
  if (!loading && !error) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
      {loading && (
        <p className="flex items-center gap-2 text-indigo-600">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          상세 정보를 불러오는 중입니다...
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default function DetailModal({
  type,
  open,
  onClose,
  detailData,
  fallback,
  loading,
  errorMessage
}: DetailModalProps) {
  const isJob = type === 'job';

  if (!open) return null;

  const jobDetail = isJob ? (detailData as JobDetailData | null | undefined) : null;
  const majorDetail = !isJob ? (detailData as MajorDetailData | null | undefined) : null;
  const fallbackData: GenericRecord =
    fallback && typeof fallback === 'object' ? (fallback as GenericRecord) : {};
  const fallbackMetadata: GenericRecord =
    fallbackData?.metadata && typeof fallbackData.metadata === 'object'
      ? (fallbackData.metadata as GenericRecord)
      : {};

  const jobRaw = (jobDetail?.rawData ?? {}) as GenericRecord;
  const jobBaseInfo = (jobRaw?.baseInfo ?? jobRaw?.baseinfo ?? {}) as GenericRecord;
  const majorRaw = (majorDetail?.rawData ?? {}) as GenericRecord;

  const jobAbilities = toRecordList(jobDetail?.abilities, ['name', 'ability_name', 'ability']);
  const jobMajors = toRecordList(jobDetail?.majors, ['curriculum', 'major', 'name']);
  const jobCertifications = toRecordList(jobDetail?.certifications, ['certificate', 'name']);
  const jobWorkList = Array.isArray(jobRaw?.workList)
    ? (jobRaw.workList as Array<GenericRecord>)
      .map((work) => toText(work?.work ?? work?.description))
      .filter(Boolean) as string[]
    : splitLines(jobDetail?.summary);
  const majorCurriculum = Array.isArray(majorRaw?.curriculum)
    ? (majorRaw.curriculum as Array<GenericRecord>)
      .map((item) => toText(item?.curriculum ?? item?.subject ?? item))
      .filter(Boolean) as string[]
    : splitLines(majorDetail?.summary);
  const majorInterest = splitLines(majorDetail?.interest);
  const majorProperty = splitLines(majorDetail?.propertyText);
  const majorCareer = splitLines(majorDetail?.job);

  const fallbackTitle = toText(
    fallbackData?.title ??
    fallbackMetadata?.jobName ??
    fallbackMetadata?.deptName ??
    fallbackMetadata?.majorName ??
    fallbackMetadata?.name
  );

  const detailTitle = isJob
    ? toText(jobBaseInfo?.job_nm ?? jobBaseInfo?.jobName ?? jobRaw?.job_nm ?? jobRaw?.jobName)
    : toText(majorDetail?.majorName ?? majorRaw?.major ?? majorRaw?.majorName);

  const title = detailTitle ?? fallbackTitle ?? (isJob ? '직업 이름 미확인' : '학과 이름 미확인');

  const summaryFromDetail = isJob ? toText(jobDetail?.summary) : toText(majorDetail?.summary);
  const fallbackSummary = isJob
    ? toText(fallbackData?.reason ?? fallbackMetadata?.summary ?? fallbackMetadata?.description)
    : toText(
      fallbackData?.summary ??
      fallbackMetadata?.summary ??
      fallbackMetadata?.deptDesc ??
      fallbackMetadata?.description
    );
  const summary = summaryFromDetail ?? fallbackSummary ?? null;

  const summaryCaption = isJob
    ? toText(jobBaseInfo?.job_ctg_nm ?? fallbackMetadata?.category ?? fallbackMetadata?.jobGroup)
    : toText(majorRaw?.lClass ?? fallbackMetadata?.lClass ?? fallbackMetadata?.field);

  const jobTagItems = [
    {
      label: '평균 연봉',
      value: formatWageText(jobDetail?.wageText ?? jobBaseInfo?.wage ?? fallbackMetadata?.wage)
    },
    {
      label: '일·생활균형',
      value: toText(jobBaseInfo?.wlb ?? fallbackMetadata?.wlb)
    },
    {
      label: '적성',
      value: toText(jobDetail?.aptitudeText ?? jobBaseInfo?.aptit_name ?? fallbackMetadata?.aptitude)
    },
    {
      label: '관련 직업',
      value: toText(jobBaseInfo?.rel_job_nm ?? fallbackMetadata?.relatedJob)
    }
  ];

  const majorTagItems = [
    {
      label: '계열',
      value: toText(majorRaw?.lClass ?? fallbackMetadata?.lClass)
    },
    {
      label: '취업률',
      value: toText(majorDetail?.employment ?? fallbackMetadata?.employment)
    },
    {
      label: '흥미',
      value: toText(majorDetail?.interest ?? fallbackMetadata?.interest)
    },
    {
      label: '진출 분야',
      value: toText(majorDetail?.job ?? fallbackMetadata?.relatedJobs ?? fallbackMetadata?.job)
    }
  ];

  const visibleTags = (isJob ? jobTagItems : majorTagItems).filter((tag) => Boolean(tag.value));

  const detailCards = isJob
    ? [
      { title: '하는 일', value: jobWorkList.length ? jobWorkList : jobDetail?.summary },
      { title: '필요 역량', value: jobAbilities.length ? jobAbilities : fallbackMetadata?.ability },
      { title: '관련 학과', value: jobMajors.length ? jobMajors : fallbackMetadata?.relatedMajors },
      { title: '자격증/준비', value: jobCertifications.length ? jobCertifications : fallbackMetadata?.certifications }
    ]
    : [
      { title: '커리큘럼', value: majorCurriculum.length ? majorCurriculum : majorDetail?.summary },
      { title: '적성 및 흥미', value: majorInterest.length ? majorInterest : majorDetail?.interest },
      { title: '학과 특성', value: majorProperty.length ? majorProperty : majorDetail?.propertyText },
      { title: '관련 직업', value: majorCareer.length ? majorCareer : fallbackMetadata?.relatedJobs }
    ];

  const descriptionList = isJob
    ? jobWorkList.length
      ? jobWorkList
      : splitLines(summary)
    : majorCurriculum.length
      ? majorCurriculum
      : splitLines(summary);

  const relatedInfo = isJob
    ? [
      {
        title: '연봉 정보',
        value:
          formatWageText(jobDetail?.wageText ?? jobBaseInfo?.wage ?? fallbackMetadata?.wage) ??
          toText(jobDetail?.wageSource ?? fallbackMetadata?.wage)
      },
      { title: '관련 자격증', value: jobCertifications.length ? jobCertifications : null },
      { title: '추천 학과', value: jobMajors.length ? jobMajors : null }
    ]
    : [
      {
        title: '취업/연봉',
        value:
          mergeText([
            majorDetail?.employment ?? fallbackMetadata?.employment,
            formatWageText(majorDetail?.salary ?? fallbackMetadata?.salary)
          ]) ?? fallbackMetadata?.employment
      },
      { title: '관련 직업', value: majorCareer.length ? majorCareer : fallbackMetadata?.relatedJobs },
      { title: '흥미 키워드', value: majorInterest.length ? majorInterest : fallbackMetadata?.interest }
    ];

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContainer>
        <header className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-500">
              {isJob ? '직업 상세' : '학과 상세'}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{title}</h2>
            {summaryCaption && <p className="mt-1 text-sm text-gray-500">{summaryCaption}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </header>

        <div className="custom-scroll flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <StatusBanner loading={loading} error={errorMessage} />

          <section className="space-y-3 rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-white to-indigo-50/70 p-6">
            <SectionTitle>요약</SectionTitle>
            <p className="text-sm leading-relaxed text-gray-700">
              {summary || `${isJob ? '직업' : '학과'} 요약 정보가 아직 제공되지 않았습니다.`}
            </p>
          </section>

          <section className="space-y-4">
            <SectionTitle>핵심 태그</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {visibleTags.length > 0 ? (
                visibleTags.map((tag) => <TagPill key={tag.label} label={tag.label} value={tag.value} />)
              ) : (
                <p className="text-sm text-gray-500">태그 정보가 아직 연결되지 않았습니다.</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>{isJob ? '업무 및 역할' : '커리큘럼/특성'}</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              {detailCards.map((card) => (
                <DetailCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  allowListSingle={card.title === '커리큘럼'}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>상세 설명</SectionTitle>
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-white/70 p-5">
              {descriptionList.length > 0 ? (
                descriptionList.map((item, index) => <DescriptionRow key={index}>{item}</DescriptionRow>)
              ) : (
                <DescriptionRow>상세 설명 데이터가 아직 준비되지 않았습니다.</DescriptionRow>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>관련 정보</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              {relatedInfo.map((info) => (
                <div key={info.title} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                  <p className="text-sm font-semibold text-gray-900">{info.title}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    {Array.isArray(info.value)
                      ? info.value.length
                        ? info.value.join(', ')
                        : '관련 데이터가 없습니다.'
                      : toText(info.value) ?? '관련 데이터가 없습니다.'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isJob ? '직업 정보' : '학과 정보'} 가이드
            </p>
            <p className="text-xs text-gray-500">
              Supabase에 저장된 CareerNet 원본 데이터를 기반으로 세부 정보를 제공합니다. 데이터가 없을 경우 추천
              메타데이터를 보조적으로 노출합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-90"
          >
            닫기
          </button>
        </footer>
      </ModalContainer>
    </ModalOverlay>
  );
}
