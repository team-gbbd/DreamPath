const cleanText = (value: string) =>
  value.replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim();

const parseNumberFromText = (input: string | number): number | null => {
  if (!input) return null;

  const normalized = cleanText(String(input));
  if (!normalized) return null;
  const base = normalized.replace(/,/g, '');

  let total = 0;
  let matched = false;

  const hundredMillionMatches = [...base.matchAll(/(\d+(?:\.\d+)?)\s*억/g)].map((m) => parseFloat(m[1]));
  if (hundredMillionMatches.length > 0) {
    matched = true;
    total += hundredMillionMatches.reduce((sum, value) => sum + value * 10000, 0);
  }

  const tenThousandMatches = [...base.matchAll(/(\d+(?:\.\d+)?)\s*만/g)].map((m) => parseFloat(m[1]));
  if (tenThousandMatches.length > 0) {
    matched = true;
    total += Math.max(...tenThousandMatches);
  }

  if (!matched) {
    const numericString = base.replace(/[^\d.]/g, '');
    if (!numericString) {
      return null;
    }
    total = parseFloat(numericString);
  }

  if (Number.isNaN(total) || total <= 0) {
    return null;
  }

  return total;
};

export const formatWageText = (value?: string | number | null): string | null => {
  const numericValue = value !== undefined && value !== null ? parseNumberFromText(value) : null;
  if (!numericValue) {
    return value ? cleanText(value) : null;
  }

  // 1억(=10,000만원) 이상 → 억 단위 반올림
  if (numericValue >= 10000) {
    const roundedEok = Math.max(1, Math.round(numericValue / 10000));
    return `${roundedEok}억원`;
  }

  // 1,000만원 이상 → 천만원 단위 반올림 (예: 2,268 → 2천만원)
  if (numericValue >= 1000) {
    const roundedThousand = Math.round(numericValue / 1000);
    return `${roundedThousand}천만원`;
  }

  // 그 외 → 10만원 단위 반올림
  const roundedTen = Math.max(10, Math.round(numericValue / 10) * 10);
  return `${roundedTen.toLocaleString()}만원`;
};
