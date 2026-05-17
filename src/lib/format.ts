export function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원';
}

export function formatRunway(value: number | '유지 가능'): string {
  if (value === '유지 가능') return value;
  return `${value.toFixed(1)}개월`;
}
