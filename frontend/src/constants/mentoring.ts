/**
 * 멘토링 관련 상수
 */

export const DAYS_OF_WEEK = [
  { key: 'monday', label: '월요일' },
  { key: 'tuesday', label: '화요일' },
  { key: 'wednesday', label: '수요일' },
  { key: 'thursday', label: '목요일' },
  { key: 'friday', label: '금요일' },
  { key: 'saturday', label: '토요일' },
  { key: 'sunday', label: '일요일' },
] as const;

export const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
] as const;

export const SPECIALIZATIONS = [
  '프론트엔드',
  '백엔드',
  '풀스택',
  '데이터 사이언스',
  '디자인',
  'PM/기획',
  '마케팅',
] as const;

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const BOOKING_STATUS_LABELS = {
  PENDING: '대기중',
  CONFIRMED: '승인됨',
  REJECTED: '거절됨',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
} as const;

export const MENTOR_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',

} as const;

export const SESSION_PACKAGE = {
  SINGLE: { name: '1회 이용권', sessions: 1, price: 30000 },
  FIVE: { name: '5회 이용권', sessions: 5, price: 140000 },
  TEN: { name: '10회 이용권', sessions: 10, price: 250000 },
} as const;

// 타입 추출
export type DayOfWeek = typeof DAYS_OF_WEEK[number]['key'];
export type TimeSlot = typeof TIME_SLOTS[number];
export type Specialization = typeof SPECIALIZATIONS[number];
export type BookingStatus = keyof typeof BOOKING_STATUS;
export type MentorStatus = keyof typeof MENTOR_STATUS;
