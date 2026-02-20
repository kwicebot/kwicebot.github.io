(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('sandbox') !== '1') return;

  const PAGE = location.pathname || '/';
  const KEY = `blog-sandbox-guided-v3:${PAGE}`;

  const FIELDS = [
    // 1) 站点基础信息
    { id: 'site.title', label: '网站主标题', page: '/', find: () => pick([
      () => qs('nav a[href="/"] .site-name'),
      () => qsa('nav a[href="/"]')[0],
      () => byText('blog.112077.xyz')
    ]) },
    { id: 'site.subtitle', label: '网站副标题', page: '/', find: () => pick([
      () => qs('nav a[href^="javascript:anzhiyu.scrollToDest"]'),
      () => qsa('nav a').find(a => textOf(a).includes(' - ')),
      () => byContains('内容模板站')
    ]) },
    { id: 'site.description', label: '站点描述', page: '/', configOnly: true },
    { id: 'site.keywords', label: '关键词(逗号分隔)', page: '/', configOnly: true },
    { id: 'author.name', label: '作者名称', page: '/', find: () => pick([
      () => footerAuthorLink(),
      () => byText('kwice')
    ]) },

    // 2) 顶部菜单与页面
    { id: 'menu.article', label: '菜单-文章', page: '/', find: () => navMenu('文章') },
    { id: 'menu.friend', label: '菜单-友链', page: '/', find: () => navMenu('友链') },
    { id: 'menu.mine', label: '菜单-我的', page: '/', find: () => navMenu('我的') },
    { id: 'menu.about', label: '菜单-关于', page: '/', find: () => navMenu('关于') },
    { id: 'menu.path.comments', label: '留言板路径', page: '/', configOnly: true },
    { id: 'menu.path.music', label: '音乐馆路径', page: '/', configOnly: true },
    { id: 'menu.path.about', label: '关于路径', page: '/', configOnly: true },
    { id: 'menu.path.essay', label: '闲言碎语路径', page: '/', configOnly: true },

    // 3) 个人信息与社交
    { id: 'social.github', label: 'GitHub链接', page: '/', configOnly: true },
    { id: 'social.email', label: '邮箱', page: '/', configOnly: true },
    { id: 'social.bilibili', label: 'Bilibili链接(可选)', page: '/', configOnly: true },
    { id: 'social.other', label: '其他社媒链接(可选)', page: '/', configOnly: true },
    { id: 'avatar.url', label: '头像URL', page: '/', configOnly: true },

    // 4) 首页模块文案
    { id: 'home.title', label: '首页主标题', page: '/', find: () => byText('你好，朋友') },
    { id: 'home.subtitle', label: '首页副标题', page: '/', find: () => byText('欢迎来到我的小站') },
    { id: 'home.default_descr', label: '首页描述文案', page: '/', find: () => byContains('这里是内容模板站') },

    // 5) 分类映射
    { id: 'category.1', label: '分类1名称', page: '/', configOnly: true },
    { id: 'category.2', label: '分类2名称', page: '/', configOnly: true },
    { id: 'category.3', label: '分类3名称', page: '/', configOnly: true },

    // 6) 音乐配置
    { id: 'music.playlist_id', label: '音乐歌单ID', page: '/', configOnly: true },
    { id: 'music.volume', label: '音乐默认音量(0~1)', page: '/', configOnly: true },

    // 7) 评论系统
    { id: 'comment.provider', label: '评论系统类型(Waline/Twikoo/Artalk/Giscus)', page: '/', configOnly: true },
    { id: 'comment.server_or_repo', label: '评论服务地址/仓库', page: '/', configOnly: true },
    { id: 'comment.key_or_id', label: '评论Key/ID', page: '/', configOnly: true },

    // 8) 页脚与声明
    { id: 'footer.badge1', label: '页脚徽标1', page: '/', find: () => byContains('博客框架为Hexo') },
    { id: 'footer.badge2', label: '页脚徽标2', page: '/', find: () => byContains('本站使用AnZhiYu主题') },
    { id: 'footer.copyright', label: '页脚版权', page: '/', find: () => byContains('©2020') },
    { id: 'footer.hosting', label: '托管平台(Cloudflare/GitHub等)', page: '/', configOnly: true },
    { id: 'footer.icp', label: '备案号(可选)', page: '/', configOnly: true },

    // 9) 图像资源
    { id: 'image.avatar', label: '头像图URL', page: '/', configOnly: true },
    { id: 'image.home_cover', label: '首页默认封面URL', page: '/', configOnly: true },
    { id: 'image.about_bg', label: '关于页背景图URL(可选)', page: '/', configOnly: true },

    // 10) 部署与DNS
    { id: 'deploy.repo', label: '部署仓库', page: '/', configOnly: true },
    { id: 'deploy.domain', label: '自定义域名', page: '/', configOnly: true },
    { id: 'deploy.dns_ok', label: 'DNS已正确指向(是/否)', page: '/', configOnly: true },
    { id: 'deploy.https_force', label: '已启用HTTPS强制(是/否)', page: '/', configOnly: true },

    // 额外：建站天数
    { id: 'runtime.launch_date', label: '建站起始日期(YYYY-MM-DD)', page: '/', configOnly: true },

    // 子页面标题
    { id: 'page.about.title', label: '关于页标题', page: '/about/', find: () => pageTitle() },
    { id: 'page.comments.title', label: '留言板标题', page: '/comments/', find: () => pageTitle() },
    { id: 'page.essay.title', label: '闲言碎语标题', page: '/essay/', find: () => pageTitle() },
    { id: 'page.music.title', label: '音乐馆标题', page: '/music/', find: () => pageTitle() }
  ];

  const state = {
    values: {},
    tab: 'current' // current | all
  };

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function textOf(el) { return (el?.textContent || '').trim(); }
  function pick(fns) { for (const f of fns) { const el = safe(f); if (el) return el; } return null; }
  function safe(fn) { try { return fn(); } catch { return null; } }

  function byText(t) {
    const all = qsa('h1,h2,h3,a,span,div,p,strong,small');
    return all.find(el => textOf(el) === t) || null;
  }

  function byContains(t) {
    const all = qsa('h1,h2,h3,a,span,div,p,strong,small');
    return all.find(el => textOf(el).includes(t)) || null;
  }

  function navMenu(name) {
    return qsa('nav a, header a').find(a => textOf(a) === name || textOf(a).startsWith(name)) || null;
  }

  function footerAuthorLink() {
    const all = qsa('footer a, [role="contentinfo"] a');
    return all.find(a => a.getAttribute('href') === '/' && textOf(a).length > 0) || null;
  }

  function pageTitle() {
    return qs('main h1, #page-header h1, .page-title, article h1') || null;
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      state.values = d.values || {};
    } catch {}
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify({
      page: PAGE,
      savedAt: new Date().toISOString(),
      values: state.values
    }));
  }

  function pageOf(urlPath) {
    return `${location.origin}${urlPath}?sandbox=1`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .sb-fab{position:fixed;right:16px;bottom:16px;z-index:1000000;border:0;border-radius:999px;padding:10px 14px;background:#425AEF;color:#fff;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer}
    .sb-panel{position:fixed;left:16px;top:16px;z-index:999999;background:rgba(18,18,22,.97);color:#fff;width:420px;max-height:86vh;overflow:auto;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.35);font-size:12px}
    .sb-head{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.12);position:sticky;top:0;background:rgba(18,18,22,.98);cursor:move;user-select:none}
    .sb-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .sb-actions button{border:0;background:#334b8a;color:#fff;padding:6px 8px;border-radius:8px;cursor:pointer}
    .sb-actions .danger{background:#8a3333}
    .sb-tabs{display:flex;gap:6px;margin-top:8px}
    .sb-tabs button{border:0;background:#253255;color:#d6def7;padding:6px 8px;border-radius:8px;cursor:pointer}
    .sb-tabs button.active{background:#425AEF;color:#fff}
    .sb-stats{margin-top:6px;font-size:11px;opacity:.85}
    .sb-list{padding:8px}
    .sb-item{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:8px;margin-bottom:8px}
    .sb-item.ok{border-color:#5fb878;background:rgba(95,184,120,.10)}
    .sb-l1{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px}
    .sb-id{color:#9ab0ff;font-size:11px}
    .sb-orig{background:rgba(255,255,255,.08);padding:6px;border-radius:7px;max-height:42px;overflow:auto;margin-bottom:6px}
    .sb-input{width:100%;border:1px solid #4f5f99;background:#111827;color:#fff;border-radius:8px;padding:6px}
    .sb-mini{display:flex;gap:6px;margin-top:6px}
    .sb-mini button{border:0;padding:5px 8px;border-radius:7px;background:#37456f;color:#fff;cursor:pointer}
    .sb-highlight{outline:2px dashed #ffd166 !important; background:rgba(255,209,102,.14)}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.className = 'sb-panel';
  panel.innerHTML = `
    <div class="sb-head" id="sbDragHandle">
      <b>沙盘配置编辑器（自动映射）</b>
      <div style="opacity:.8;margin-top:4px">不再手动绑定。每项有“原文字+输入框”，直接改、直接看效果。</div>
      <div class="sb-actions">
        <button id="sbExport">导出部署JSON</button>
        <button id="sbCopy">复制JSON</button>
        <button id="sbReset" class="danger">清空本页草稿</button>
      </div>
      <div class="sb-tabs">
        <button id="sbTabCurrent" class="active">当前页面配置</button>
        <button id="sbTabAll">全部可改配置</button>
      </div>
      <div class="sb-stats" id="sbStats">-</div>
    </div>
    <div class="sb-list" id="sbList"></div>
  `;
  document.body.appendChild(panel);

  const fab = document.createElement('button');
  fab.className = 'sb-fab';
  fab.textContent = '打开字段清单';
  document.body.appendChild(fab);

  panel.style.display = 'block';
  fab.textContent = '收起字段清单';
  fab.addEventListener('click', () => {
    const hidden = panel.style.display === 'none';
    panel.style.display = hidden ? 'block' : 'none';
    fab.textContent = hidden ? '收起字段清单' : '打开字段清单';
  });

  // draggable
  const dragHandle = panel.querySelector('#sbDragHandle');
  let dragging = false, ox = 0, oy = 0;
  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    const r = panel.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    panel.style.left = `${r.left}px`;
    panel.style.top = `${r.top}px`;
    panel.style.right = 'auto';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - ox));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - oy));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  });
  document.addEventListener('mouseup', () => dragging = false);

  const listEl = panel.querySelector('#sbList');
  const statsEl = panel.querySelector('#sbStats');
  const tabCurrentBtn = panel.querySelector('#sbTabCurrent');
  const tabAllBtn = panel.querySelector('#sbTabAll');
  const exportBtn = panel.querySelector('#sbExport');
  const copyBtn = panel.querySelector('#sbCopy');
  const resetBtn = panel.querySelector('#sbReset');

  function render() {
    listEl.innerHTML = '';

    const totalConfigured = FIELDS.filter(f => (state.values[f.id] ?? '').toString().trim() !== '').length;
    const currentFields = FIELDS.filter(f => f.page === PAGE);
    const currentConfigured = currentFields.filter(f => (state.values[f.id] ?? '').toString().trim() !== '').length;
    statsEl.textContent = `总配置：${totalConfigured}/${FIELDS.length} ｜ 当前页：${currentConfigured}/${currentFields.length}`;

    tabCurrentBtn.classList.toggle('active', state.tab === 'current');
    tabAllBtn.classList.toggle('active', state.tab === 'all');

    const visibleFields = state.tab === 'current' ? currentFields : FIELDS;

    visibleFields.forEach((f, idx) => {
      const onPage = f.page === PAGE;
      const item = document.createElement('div');
      let target = null;
      let orig = '';

      if (onPage && !f.configOnly) {
        target = f.find();
        orig = textOf(target);
      }

      const val = (state.values[f.id] ?? (onPage ? orig : ''));
      const ok = f.configOnly ? true : (onPage && !!target);

      item.className = `sb-item ${ok ? 'ok' : ''}`;
      item.innerHTML = `
        <div class="sb-l1">
          <div><b>${idx + 1}. ${f.label}</b><div class="sb-id">${f.id}</div></div>
          <div>${f.configOnly ? '⚙️ 配置项' : (onPage ? (ok ? '✅ 已识别' : '⚠️ 未识别') : `➡ 去 ${f.page}`)}</div>
        </div>
        <div class="sb-orig">原文字：${f.configOnly ? '（配置项，无页面原文）' : (onPage ? (orig || '<空>') : '此字段不在当前页面')}</div>
        <input class="sb-input" data-id="${f.id}" value="${escapeHtmlAttr(val)}" placeholder="在这里直接改文案" ${((onPage && ok) || f.configOnly) ? '' : 'disabled'} />
        <div class="sb-mini">
          ${f.configOnly ? `<button data-act="apply" data-id="${f.id}">应用</button>` : (onPage ? `<button data-act="focus" data-id="${f.id}">定位</button><button data-act="apply" data-id="${f.id}">应用</button>` : `<button data-act="goto" data-page="${f.page}">打开对应页面</button>`)}
        </div>
      `;

      listEl.appendChild(item);
    });
  }

  function escapeHtmlAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function applyField(id) {
    const f = FIELDS.find(x => x.id === id);
    if (!f) return;
    const input = listEl.querySelector(`input[data-id="${CSS.escape(id)}"]`);
    if (!input) return;

    if (f.configOnly) {
      state.values[id] = input.value;
      save();
      alert('已保存配置项，导出 JSON 后我会落到 Hexo 配置并上线。');
      render();
      return;
    }

    if (f.page !== PAGE) return;
    const el = f.find();
    if (!el) return;

    // 保护：避免误把大容器整段替换
    if ((el.children?.length || 0) > 8 || (textOf(el).length > 220 && id === 'site.subtitle')) {
      alert('检测到目标元素过大，已阻止本次写入。请刷新后重试。');
      return;
    }

    el.textContent = input.value;
    state.values[id] = input.value;
    save();
    flash(el);
    render();
  }

  function flash(el) {
    el.classList.add('sb-highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.classList.remove('sb-highlight'), 1200);
  }

  tabCurrentBtn.addEventListener('click', () => {
    state.tab = 'current';
    render();
  });

  tabAllBtn.addEventListener('click', () => {
    state.tab = 'all';
    render();
  });

  listEl.addEventListener('input', (e) => {
    const input = e.target.closest('input[data-id]');
    if (!input) return;
    state.values[input.dataset.id] = input.value;
    save();
    render();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === 'focus') {
      const f = FIELDS.find(x => x.id === id);
      const el = f?.find();
      if (el) flash(el);
    }

    if (act === 'apply') applyField(id);

    if (act === 'goto') {
      location.href = pageOf(btn.dataset.page);
    }
  });

  exportBtn.addEventListener('click', () => {
    const payload = {
      site: location.origin,
      page: PAGE,
      exportedAt: new Date().toISOString(),
      fields: FIELDS.map(f => ({ id: f.id, label: f.label, page: f.page, value: state.values[f.id] ?? '' }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `deploy-draft-${(PAGE === '/' ? 'home' : PAGE.replace(/\//g, '_'))}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  copyBtn.addEventListener('click', async () => {
    const payload = {
      site: location.origin,
      page: PAGE,
      exportedAt: new Date().toISOString(),
      fields: FIELDS.map(f => ({ id: f.id, label: f.label, page: f.page, value: state.values[f.id] ?? '' }))
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      copyBtn.textContent = '已复制';
      setTimeout(() => (copyBtn.textContent = '复制JSON'), 1200);
    } catch {
      alert('复制失败，请使用导出按钮。');
    }
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('确认清空本页草稿？')) return;
    localStorage.removeItem(KEY);
    location.reload();
  });

  // 允许正常点击浏览（不再全局拦截）

  load();
  render();
})();
