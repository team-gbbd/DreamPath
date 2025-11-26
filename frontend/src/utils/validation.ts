/**
 * 폼 입력값 검증 유틸리티
 */

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 필수 필드 검증
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * 최소 길이 검증
 */
export function minLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

/**
 * 최대 길이 검증
 */
export function maxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

/**
 * 숫자 범위 검증
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 날짜 유효성 검증
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;

  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * 미래 날짜인지 검증
 */
export function isFutureDate(dateStr: string): boolean {
  if (!isValidDate(dateStr)) return false;

  try {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 시간 부분 제거

    return date >= now;
  } catch (error) {
    return false;
  }
}

/**
 * 가격 유효성 검증 (양수, 최대값)
 */
export function isValidPrice(price: number): boolean {
  return price >= 0 && price <= 10000000; // 최대 천만원
}

/**
 * 시간 슬롯 형식 검증 (HH:MM-HH:MM)
 */
export function isValidTimeSlot(timeSlot: string): boolean {
  const timeSlotRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
  return timeSlotRegex.test(timeSlot);
}

/**
 * 단일 시간 형식 검증 (HH:MM)
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^\d{2}:\d{2}$/;
  return timeRegex.test(time);
}

/**
 * 멘토링 세션 폼 검증
 */
export interface SessionFormData {
  title: string;
  description: string;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: number;
  price: number;
}

export interface ValidationErrors {
  title?: string;
  description?: string;
  sessionDate?: string;
  sessionTime?: string;
  durationMinutes?: string;
  price?: string;
}

export function validateSessionForm(data: SessionFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // 제목 검증
  if (!isRequired(data.title)) {
    errors.title = '제목을 입력해주세요.';
  } else if (!minLength(data.title, 2)) {
    errors.title = '제목은 최소 2자 이상이어야 합니다.';
  } else if (!maxLength(data.title, 100)) {
    errors.title = '제목은 최대 100자까지 입력 가능합니다.';
  }

  // 설명 검증
  if (!isRequired(data.description)) {
    errors.description = '설명을 입력해주세요.';
  } else if (!minLength(data.description, 10)) {
    errors.description = '설명은 최소 10자 이상이어야 합니다.';
  } else if (!maxLength(data.description, 1000)) {
    errors.description = '설명은 최대 1000자까지 입력 가능합니다.';
  }

  // 날짜 검증
  if (!isRequired(data.sessionDate)) {
    errors.sessionDate = '날짜를 선택해주세요.';
  } else if (!isValidDate(data.sessionDate)) {
    errors.sessionDate = '올바른 날짜 형식이 아닙니다.';
  } else if (!isFutureDate(data.sessionDate)) {
    errors.sessionDate = '미래 날짜를 선택해주세요.';
  }

  // 시간 검증
  if (!isRequired(data.sessionTime)) {
    errors.sessionTime = '시간을 선택해주세요.';
  } else if (!isValidTime(data.sessionTime)) {
    errors.sessionTime = '올바른 시간 형식이 아닙니다.';
  }

  // 시간(분) 검증
  if (!isRequired(data.durationMinutes)) {
    errors.durationMinutes = '시간을 입력해주세요.';
  } else if (!inRange(data.durationMinutes, 30, 180)) {
    errors.durationMinutes = '시간은 30분에서 180분 사이여야 합니다.';
  }

  // 가격 검증
  if (!isRequired(data.price)) {
    errors.price = '가격을 입력해주세요.';
  } else if (!isValidPrice(data.price)) {
    errors.price = '가격은 0원에서 10,000,000원 사이여야 합니다.';
  }

  return errors;
}

/**
 * 예약 메시지 검증
 */
export function validateBookingMessage(message: string): string | null {
  if (!isRequired(message)) {
    return '메시지를 입력해주세요.';
  }

  if (!minLength(message, 10)) {
    return '메시지는 최소 10자 이상이어야 합니다.';
  }

  if (!maxLength(message, 500)) {
    return '메시지는 최대 500자까지 입력 가능합니다.';
  }

  return null;
}
