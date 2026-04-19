/* ============================================================
   projects.js — 项目详情页配置（手动可编辑）
   ============================================================

   渲染流程：
     projects.generated.js 生成每个项目的基础内容（extract.py 产出）
     ↓
     本文件 PROJECT_OVERRIDES 按 slug 覆盖 / 追加
     ↓
     project.html 最终渲染 window.PROJECT_DATA

   要替换某个项目的内容，只需在下面 PROJECT_OVERRIDES 里把对应
   slug 整段写出来（会完全替换 generated 版本）。
   不想全换、只想改标题之类的局部字段，用 mergeFields(slug, {...})。

   ------------------------------------------------------------
   支持的 slug: xiaohongshu / mokee / newtap / douyin / sia-tv / oppo
   ------------------------------------------------------------

   项目对象结构：
   {
     name: '显示名',                 // 可选，默认取 PROJECTS[].name
     category: 'PRODUCT DESIGN',     // 可选，显示在 hero 顶部
     year: '2025',                   // 可选
     sections: [ ...section ]        // 按顺序渲染的内容块
   }

   ------------------------------------------------------------
   Section 类型（type 字段决定渲染器）
   ------------------------------------------------------------

   1) hero —— 顶部首屏
      {
        type: 'hero',
        title:    'Xiaohongshu',       // 大标题
        subtitle: '一句话副标题/简介',   // 副文
        category: 'PRODUCT DESIGN',    // 可选，覆盖顶部分类
        year:     '2025',              // 可选
        media: { type: 'image'|'video', src: 'assets/xxx/01.avif' }  // 可选
      }

   2) text —— 图文段落（左侧 eyebrow + 右侧标题正文）
      {
        type: 'text',
        eyebrow: 'OVERVIEW',   // 可选，左栏小字
        title:   'About',      // 可选，右栏标题
        body:    '这里是正文……' // 必填
      }

   3) image —— 单图
      {
        type: 'image',
        src:       'assets/xxx/02.avif',
        caption:   '可选图注',
        fullBleed: true    // true=通栏，false=居中盒内
      }

   4) video —— 单视频
      {
        type: 'video',
        src: 'assets/xxx/03.mp4',
        poster:    'assets/xxx/03.jpg', // 可选封面
        autoplay:  true,                // 默认 true
        loop:      true,                // 默认 true
        muted:     true,                // 默认 true
        fullBleed: true
      }

   5) gallery —— 多图网格
      {
        type: 'gallery',
        columns: 2,   // 1 / 2 / 3
        items: [
          { src: 'assets/xxx/04.avif', caption: '' },
          { src: 'assets/xxx/05.avif', caption: '' }
        ]
      }

   6) quote —— 引语
      {
        type: 'quote',
        text:   '设计不是外观，而是如何工作。',
        author: 'Steve Jobs'   // 可选
      }

   7) meta —— 底部信息表
      {
        type: 'meta',
        items: [
          { label: 'Role',     value: 'Lead Designer' },
          { label: 'Year',     value: '2025' },
          { label: 'Team',     value: '3 designers, 8 engineers' },
          { label: 'Platform', value: 'iOS / Android' }
        ]
      }

   ============================================================
   下面就是配置区 —— 按需编辑
   ============================================================ */

(function () {
  // —— 在此处覆盖任意 slug ——
  // 留空 {} 时沿用自动生成内容。
  const PROJECT_OVERRIDES = {

    // 示例：完全自定义 xiaohongshu
    // xiaohongshu: {
    //   category: 'PRODUCT DESIGN',
    //   year: '2025',
    //   sections: [
    //     { type: 'hero',
    //       title: 'Xiaohongshu Live',
    //       subtitle: '重构小红书直播间底部功能架构',
    //       media: { type: 'image', src: 'assets/xiaohongshu/01.avif' } },
    //     { type: 'text', eyebrow: 'OVERVIEW', title: 'Background',
    //       body: '小红书直播业务 DAU 超 1 亿，本项目重构互动/电商直播间的底部功能布局。' },
    //     { type: 'image', src: 'assets/xiaohongshu/02.avif', fullBleed: true },
    //     { type: 'quote', text: '做减法，让用户的每次点击都有收获。' },
    //     { type: 'meta', items: [
    //       { label: 'Role', value: 'Lead Product Designer' },
    //       { label: 'Year', value: '2025' },
    //       { label: 'Platform', value: 'iOS / Android' }
    //     ] }
    //   ]
    // },

  };

  // ——（可选）只覆盖部分字段：mergeFields('douyin', { category: 'MOTION' })——
  const PATCHES = [
    // { slug: 'douyin', patch: { category: 'PRODUCT DESIGN, MOTION' } },
  ];

  // ============================================================
  // 以下是合并逻辑，一般不需要改
  // ============================================================
  const base = window.PROJECT_DATA_GENERATED || {};
  const merged = {};
  Object.keys(base).forEach(k => { merged[k] = base[k]; });
  Object.keys(PROJECT_OVERRIDES).forEach(k => { merged[k] = PROJECT_OVERRIDES[k]; });
  PATCHES.forEach(({ slug, patch }) => {
    if (!merged[slug]) return;
    merged[slug] = Object.assign({}, merged[slug], patch);
  });
  window.PROJECT_DATA = merged;
})();
