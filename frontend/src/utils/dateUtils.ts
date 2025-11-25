/**
 * 날짜 및 시간 유틸리티 함수
 */

/**
 * ISO 날짜 문자열을 한국어 형식으로 변환
 * @example "2025-01-15" -> "2025년 1월 15일"
 */
export function formatKoreanDate(dateStr: string): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${year}년 ${month}월 ${day}일`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * ISO 날짜 문자열을 YYYY-MM-DD 형식으로 변환
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch (error) {
    return dateStr;
  }
}

/**
 * ISO 날짜 문자열을 상대 시간으로 변환
 * @example "2025-01-15" -> "2시간 전", "3일 전"
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return `${Math.floor(diffDays / 365)}년 전`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * ISO 날짜시간 문자열을 한국어 형식으로 변환
 * @example "2025-01-15T14:30:00" -> "2025년 1월 15일 오후 2시 30분"
 */
export function formatKoreanDateTime(dateStr: string): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

    return `${year}년 ${month}월 ${day}일 ${period} ${displayHours}시 ${minutes.toString().padStart(2, '0')}분`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * 날짜가 오늘인지 확인
 */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;

  try {
    const date = new Date(dateStr);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  } catch (error) {
    return false;
  }
}

/**
 * 날짜가 과거인지 확인
 */
export function isPast(dateStr: string): boolean {
  if (!dateStr) return false;

  try {
    const date = new Date(dateStr);
    const now = new Date();
    return date < now;
  } catch (error) {
    return false;
  }
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
