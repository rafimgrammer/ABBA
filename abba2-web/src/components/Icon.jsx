// Lucide 라인 아이콘. vanilla 판의 ico(name, size)를 대체한다.
// path 데이터는 정적 상수(icons.js)뿐이라 dangerouslySetInnerHTML이 안전하다.
import { I } from '../lib/icons.js';

export function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: I[name] }}
    />
  );
}
