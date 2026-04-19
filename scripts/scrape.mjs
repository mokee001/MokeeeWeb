/**
 * scripts/scrape.mjs
 * 自动抓取 Framer 项目页 → 下载图片/视频 → 生成 projects.generated.js
 *
 * 用法：
 *   cd portfolio-demo
 *   npm i -D puppeteer
 *   node scripts/scrape.mjs
 *
 * 抓取目标：见下方 TARGETS。修改 slug / url 即可。
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

const TARGETS = [
  { slug: 't11',          url: 'https://thistle-center-182160.framer.app/projects/shop-bag' },
  { slug: 'teletech',     url: 'https://thistle-center-182160.framer.app/projects/voicelive' },
  { slug: 'oppo-website', url: 'https://thistle-center-182160.framer.app/projects/oppo-web' },
  { slug: 'sia-tv',       url: 'https://thistle-center-182160.framer.app/projects/sia-tv' },
  { slug: 'douyin',       url: 'https://thistle-center-182160.framer.app/projects/dou-yin' },
  { slug: 'newtap',       url: 'https://thistle-center-182160.framer.app/projects/newtap' },
  { slug: 'other',        url: 'https://thistle-center-182160.framer.app/projects/other' },
];

/* ============================================================
   下载文件
   ============================================================ */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, async (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
      } catch {}
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', async () => {
        try {
          await fs.writeFile(dest, Buffer.concat(chunks));
          resolve(dest);
        } catch (e) { reject(e); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

function extFromUrl(u) {
  try {
    const clean = u.split('?')[0].split('#')[0];
    const ext = path.extname(clean).toLowerCase();
    return /\.(jpe?g|png|webp|gif|avif|mp4|webm|mov)$/.test(ext) ? ext : '';
  } catch { return ''; }
}

/* ============================================================
   抓取单个项目
   ============================================================ */
async function scrapeOne(browser, target) {
  console.log(`\n→ ${target.slug}  ${target.url}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 收集网络请求中所有图片/视频
  const mediaUrls = new Set();
  page.on('response', (resp) => {
    const url = resp.url();
    const type = resp.headers()['content-type'] || '';
    if (/^image\/|^video\//.test(type)) mediaUrls.add(url);
  });

  await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });

  // 触发懒加载：滚动到底部
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 600;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          setTimeout(resolve, 1500);
        }
      }, 200);
    });
  });

  // 提取按 DOM 顺序的媒体 + 文本
  const dom = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    // 标题
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    const title = h1?.innerText?.trim() || document.title || '';
    const subtitle = h2?.innerText?.trim() || '';

    // 段落
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.innerText.trim())
      .filter(t => t.length > 30);

    // 按视觉顺序遍历 img / video / source
    const all = document.querySelectorAll('img, video, source, picture source');
    all.forEach(el => {
      let src = el.currentSrc || el.src || el.getAttribute('src') || el.getAttribute('srcset')?.split(' ')[0];
      if (!src) return;
      if (src.startsWith('data:')) return;
      if (seen.has(src)) return;
      seen.add(src);
      const tag = el.tagName.toLowerCase();
      const rect = el.getBoundingClientRect();
      results.push({
        src,
        type: tag === 'video' || tag === 'source' ? 'video' : 'image',
        w: el.naturalWidth || el.videoWidth || rect.width || 0,
        h: el.naturalHeight || el.videoHeight || rect.height || 0,
        alt: el.alt || '',
      });
    });

    return { title, subtitle, paragraphs, media: results };
  });

  // 加上网络层捕获的（防漏）
  for (const u of mediaUrls) {
    if (![...dom.media].some(m => m.src === u)) {
      dom.media.push({ src: u, type: u.match(/\.(mp4|webm|mov)/i) ? 'video' : 'image', w: 0, h: 0, alt: '' });
    }
  }

  // 过滤太小的（图标/分享图）
  dom.media = dom.media.filter(m => m.type === 'video' || (m.w === 0 && m.h === 0) || (m.w >= 240 && m.h >= 160));

  await page.close();

  // 下载所有媒体到 assets/<slug>/
  const outDir = path.join(ASSETS_DIR, target.slug);
  await fs.mkdir(outDir, { recursive: true });
  const localMedia = [];
  let i = 0;
  for (const m of dom.media) {
    i++;
    const ext = extFromUrl(m.src) || (m.type === 'video' ? '.mp4' : '.jpg');
    const fname = String(i).padStart(2, '0') + ext;
    const dest = path.join(outDir, fname);
    try {
      await download(m.src, dest);
      localMedia.push({ ...m, local: `assets/${target.slug}/${fname}` });
      process.stdout.write('.');
    } catch (e) {
      console.warn(`  ✗ ${m.src} (${e.message})`);
    }
  }
  console.log(` ${localMedia.length} files`);

  return { target, ...dom, media: localMedia };
}

/* ============================================================
   将抓到的内容转为 sections
   ============================================================ */
function toSections(scraped) {
  const { target, title, subtitle, paragraphs, media } = scraped;
  const sections = [];
  const heroMedia = media[0];
  sections.push({
    type: 'hero',
    title: title || target.slug,
    subtitle: subtitle || (paragraphs[0] || '').slice(0, 120),
    media: heroMedia ? { type: heroMedia.type, src: heroMedia.local } : undefined,
  });
  if (paragraphs[0]) {
    sections.push({ type: 'text', eyebrow: 'OVERVIEW', title: 'About', body: paragraphs[0] });
  }
  // 剩余媒体按顺序展开
  const rest = media.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const m = rest[i];
    if (m.type === 'video') {
      sections.push({ type: 'video', src: m.local, autoplay: true, loop: true, muted: true, fullBleed: true });
    } else {
      sections.push({ type: 'image', src: m.local, fullBleed: true });
    }
    // 适当插入剩余文案
    const pIdx = i + 1;
    if (paragraphs[pIdx]) {
      sections.push({ type: 'text', body: paragraphs[pIdx] });
    }
  }
  return sections;
}

/* ============================================================
   主流程
   ============================================================ */
const browser = await puppeteer.launch({ headless: 'new' });
const all = {};
for (const t of TARGETS) {
  try {
    const scraped = await scrapeOne(browser, t);
    all[t.slug] = { sections: toSections(scraped) };
  } catch (e) {
    console.error(`! ${t.slug} failed: ${e.message}`);
  }
}
await browser.close();

const out = `/* AUTO-GENERATED by scripts/scrape.mjs — DO NOT EDIT MANUALLY (or do, then re-run script will overwrite) */
window.PROJECT_DATA = ${JSON.stringify(all, null, 2)};
`;
await fs.writeFile(path.join(ROOT, 'projects.generated.js'), out);
console.log('\n✓ Wrote projects.generated.js');
console.log('  → 在 project.html 中把 <script src="projects.js"> 替换为 projects.generated.js 即可启用。');
