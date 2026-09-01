// 빌드 산출물은 vanilla 판의 build.py와 같다.
//   dist/abba2.html           더블클릭으로 바로 열리는 단일 파일(팀 공유·시연용)
//   dist/abba2.artifact.html  Claude 아티팩트 게시용(문서 래퍼 없음)
// file://에서도 열려야 하므로 번들은 module이 아니라 IIFE로 뽑고, CSS·JS를 전부 인라인한다.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const OUT = resolve(process.cwd(), 'dist');
const ARTIFACT_FONT = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap';

/** index.html → abba2.html + abba2.artifact.html */
function emitTeamFiles() {
  return {
    name: 'abba2-emit-team-files',
    closeBundle() {
      const src = resolve(OUT, 'index.html');
      // 번들이 IIFE라 module 스코프가 필요 없다. type="module"을 떼야 file://에서도 실행된다.
      // 다만 module의 defer 동작까지 같이 사라지므로, 스크립트를 </body> 앞으로 옮긴다.
      let html = readFileSync(src, 'utf8').replace('<style rel="stylesheet" crossorigin>', '<style>');
      const tag = html.match(/<script type="module" crossorigin>[\s\S]*?<\/script>/);
      if (!tag) throw new Error('[abba2] 인라인 번들 스크립트를 찾지 못했다');
      // 번들 안의 $& 같은 문자열이 치환 패턴으로 해석되지 않도록 replacer 함수를 쓴다.
      const inline = tag[0].replace('<script type="module" crossorigin>', '<script>');
      html = html.replace(tag[0], () => '').replace('</body>', () => `${inline}\n</body>`);
      writeFileSync(resolve(OUT, 'abba2.html'), html);

      // 아티팩트판: <html>/<head>/<body> 래퍼를 벗기고 웹폰트만 바꾼다.
      const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
      const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
      const artifact = (head + body)
        .replace(/<meta[^>]*>\s*/g, '')
        .replace(/href="https:\/\/cdn\.jsdelivr\.net[^"]*"/, `href="${ARTIFACT_FONT}"`)
        .trim() + '\n';
      writeFileSync(resolve(OUT, 'abba2.artifact.html'), artifact);
      rmSync(src);

      const kb = n => `${(n / 1024).toFixed(0)}KB`;
      console.log(`[abba2] dist/abba2.html ${kb(html.length)} · dist/abba2.artifact.html ${kb(artifact.length)}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), emitTeamFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    reportCompressedSize: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
