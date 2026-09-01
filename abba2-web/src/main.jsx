// 부팅. vanilla 판의 main.js를 대신한다 — window에 함수를 노출할 필요가 없어졌다
// (인라인 onclick이 사라지고 각 화면이 컴포넌트가 됐다).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import { App } from './App.jsx';
import { ENGINE } from './lib/engine.js';
import { S } from './store.js';
import { go } from './routing.js';

// 계산 엔진은 콘솔·UI 테스트에서 직접 두드려 보므로 전역에 남겨 둔다.
Object.assign(window, { ENGINE, S, go });

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
