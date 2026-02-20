(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('sandbox') !== '1') return;

  const PAGE_KEY = location.pathname || '/';
  const KEY = `blog-sandbox-guided-v1:${PAGE_KEY}`;

  const FIELDS = [
    { id: 'site.title', label: '网站主标题' },
    { id: 'site.subtitle', label: '网站副标题' },
    { id: 'site.description', label: '站点描述' },
    { id: 'author.name', label: '作者名称' },
    { id: 'home.title', label: '首页主标题' },
    { id: 'home.subtitle', label: '首页副标题' },
    { id: 'home.default_descr', label: '首页描述文案' },
    { id: 'menu.article', label: '菜单-文章（文案）' },
    { id: 'menu.friend', label: '菜单-友链（文案）' },
    { id: 'menu.mine', label: '菜单-我的（文案）' },
    { id: 'menu.about', label: '菜单-关于（文案）' },
    { id: 'page.about.title', label: '关于页标题' },
    { id: 'page.comments.title', label: '留言板标题' },
    { id: 'page.essay.title', label: '闲言碎语标题' },
    { id: 'page.music.title', label: '音乐馆标题' },
    { id: 'footer.copyright', label: '页脚版权文案' },
    { id: 'footer.badge1', label: '页脚徽标1文案' },
    { id: 'footer.badge2', label: '页脚徽标2文案' }
  ];

  const state = {
    bindMode: false,
    activeFieldId: null,
    bindings: {},
    values: {}
  };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      state.bindings = d.bindings || {};
      state.values = d.values || {};
    } catch {}
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify({
      page: PAGE_KEY,
      savedAt: new Date().toISOString(),
      bindings: state.bindings,
      values: state.values
    }));
  }

  function pathOf(el) {
    if (!el || el === document.body) return '/html/body';
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      let idx = 1;
      let p = cur;
      while ((p = p.previousElementSibling)) if (p.tagName === cur.tagName) idx++;
      parts.unshift(`${cur.tagName.toLowerCase()}[${idx}]`);
      cur = cur.parentElement;
    }
    return '/html/body/' + parts.join('/');
  }

  function byPath(path) {
    if (!path) return null;
    try {
      const segs = path.replace('/html/body/', '').split('/').filter(Boolean);
      let node = document.body;
      for (const seg of segs) {
        const m = seg.match(/^([a-z0-9-]+)\[(\d+)\]$/i);
        if (!m) return null;
        const tag = m[1].toUpperCase();
        const n = Number(m[2]);
        let c = 0;
        let found = null;
        for (const child of node.children) {
          if (child.tagName === tag) {
            c++;
            if (c === n) { found = child; break; }
          }
        }
        if (!found) return null;
        node = found;
      }
      return node;
    } catch {
      return null;
    }
  }

  function editable(el) {
    if (!el) return false;
    if (el.closest('.sb-panel')) return false;
    const tag = el.tagName;
    if (['SCRIPT','STYLE','CODE','PRE','SVG','PATH','INPUT','TEXTAREA','SELECT'].includes(tag)) return false;
    return (el.textContent || '').trim().length > 0;
  }

  const style = document.createElement('style');
  style.textContent = `
    .sb-panel{position:fixed;left:16px;top:16px;z-index:999999;background:rgba(18,18,22,.96);color:#fff;width:380px;max-height:86vh;overflow:auto;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.35);font-size:12px}
    .sb-head{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.12);position:sticky;top:0;background:rgba(18,18,22,.98)}
    .sb-head b{font-size:13px}
    .sb-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .sb-actions button{border:0;background:#334b8a;color:#fff;padding:6px 8px;border-radius:8px;cursor:pointer}
    .sb-actions .danger{background:#8a3333}
    .sb-list{padding:8px}
    .sb-item{border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px;margin-bottom:8px}
    .sb-item.done{border-color:#5fb878;background:rgba(95,184,120,.12)}
    .sb-item .row{display:flex;justify-content:space-between;gap:6px;align-items:center}
    .sb-item .id{color:#9ab0ff;font-size:11px}
    .sb-item .btns{display:flex;gap:4px;margin-top:6px}
    .sb-item button{border:0;padding:4px 7px;border-radius:7px;cursor:pointer;background:#2f3b62;color:#fff}
    .sb-item button.secondary{background:#4d4d4d}
    .sb-item button.warn{background:#7a5b2a}
    .sb-target{outline:2px dashed #4f7cff !important;cursor:text !important}
    .sb-marker{position:absolute;background:#4f7cff;color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;z-index:999998;pointer-events:none}
    .sb-binding{outline:2px solid rgba(95,184,120,.9) !important}
    [contenteditable='true']{outline:2px solid #ffd166 !important;background:rgba(255,209,102,.15)}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.className = 'sb-panel';
  panel.innerHTML = `
    <div class="sb-head">
      <b>沙盘配置编辑器（可上线版）</b>
      <div style="opacity:.8;margin-top:4px">先点“绑定位置”，再点“编辑文字”。每一项可视定位，可导出配置。</div>
      <div class="sb-actions">
        <button id="sbBindToggle">绑定模式：关</button>
        <button id="sbExport">导出部署JSON</button>
        <button id="sbCopy">复制JSON</button>
        <button id="sbReset" class="danger">清空本页</button>
      </div>
    </div>
    <div class="sb-list" id="sbList"></div>
  `;
  document.body.appendChild(panel);

  const listEl = panel.querySelector('#sbList');
  const bindToggleBtn = panel.querySelector('#sbBindToggle');
  const exportBtn = panel.querySelector('#sbExport');
  const copyBtn = panel.querySelector('#sbCopy');
  const resetBtn = panel.querySelector('#sbReset');

  const markers = new Map();

  function placeMarker(fieldId, el, text) {
    let m = markers.get(fieldId);
    if (!m) {
      m = document.createElement('div');
      m.className = 'sb-marker';
      document.body.appendChild(m);
      markers.set(fieldId, m);
    }
    m.textContent = text;
    const r = el.getBoundingClientRect();
    m.style.left = `${window.scrollX + Math.max(4, r.left)}px`;
    m.style.top = `${window.scrollY + Math.max(4, r.top - 18)}px`;
  }

  function clearMarkers() {
    for (const m of markers.values()) m.remove();
    markers.clear();
  }

  function applySaved() {
    clearMarkers();
    FIELDS.forEach((f, idx) => {
      const path = state.bindings[f.id];
      const el = byPath(path);
      if (el) {
        el.classList.add('sb-binding');
        if (typeof state.values[f.id] === 'string') el.textContent = state.values[f.id];
        placeMarker(f.id, el, String(idx + 1));
      }
    });
  }

  function refreshList() {
    listEl.innerHTML = '';
    FIELDS.forEach((f, idx) => {
      const hasBind = !!state.bindings[f.id];
      const hasVal = typeof state.values[f.id] === 'string';
      const item = document.createElement('div');
      item.className = `sb-item ${hasVal ? 'done' : ''}`;
      item.innerHTML = `
        <div class="row">
          <div>
            <div><b>${idx + 1}. ${f.label}</b></div>
            <div class="id">${f.id}</div>
          </div>
          <div>${hasVal ? '✅ 已改' : hasBind ? '📍 已绑' : '⚪ 未绑'}</div>
        </div>
        <div class="btns">
          <button data-act="bind" data-id="${f.id}">绑定位置</button>
          <button data-act="edit" data-id="${f.id}" class="warn">编辑文字</button>
          <button data-act="focus" data-id="${f.id}" class="secondary">定位查看</button>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  function beginEditField(fieldId) {
    const el = byPath(state.bindings[fieldId]);
    if (!el) {
      alert('请先绑定该字段对应页面元素。');
      return;
    }
    el.setAttribute('contenteditable', 'true');
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function focusField(fieldId) {
    const el = byPath(state.bindings[fieldId]);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('sb-target');
    setTimeout(() => el.classList.remove('sb-target'), 1000);
  }

  bindToggleBtn.addEventListener('click', () => {
    state.bindMode = !state.bindMode;
    state.activeFieldId = null;
    bindToggleBtn.textContent = `绑定模式：${state.bindMode ? '开' : '关'}`;
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === 'bind') {
      state.bindMode = true;
      state.activeFieldId = id;
      bindToggleBtn.textContent = '绑定模式：开';
      alert(`请点击页面中“${FIELDS.find(x => x.id === id)?.label}”对应的文字元素进行绑定。`);
    }
    if (act === 'edit') beginEditField(id);
    if (act === 'focus') focusField(id);
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.sb-panel')) return;

    // 绑定模式：点击页面元素完成绑定
    if (state.bindMode && state.activeFieldId) {
      const target = e.target.closest('*');
      if (!editable(target)) return;
      e.preventDefault();
      e.stopPropagation();

      state.bindings[state.activeFieldId] = pathOf(target);
      if (typeof state.values[state.activeFieldId] !== 'string') {
        state.values[state.activeFieldId] = target.textContent || '';
      }
      save();
      applySaved();
      refreshList();

      state.activeFieldId = null;
      state.bindMode = false;
      bindToggleBtn.textContent = '绑定模式：关';
      return;
    }

    // 默认拦截原点击行为，避免触发主题动效干扰编辑
    const clickable = e.target.closest('a,button,[role="button"],.menu-item,.nav-item');
    if (clickable) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('dblclick', (e) => {
    if (e.target.closest('.sb-panel')) return;
    const target = e.target.closest('*');
    if (!editable(target)) return;
    e.preventDefault();
    e.stopPropagation();
    target.setAttribute('contenteditable', 'true');
    target.focus();
  }, true);

  document.addEventListener('blur', (e) => {
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute('contenteditable') === 'true') {
      el.removeAttribute('contenteditable');
      const p = pathOf(el);
      const pair = Object.entries(state.bindings).find(([, v]) => v === p);
      if (pair) {
        state.values[pair[0]] = el.textContent || '';
        save();
        refreshList();
      }
    }
  }, true);

  exportBtn.addEventListener('click', () => {
    const payload = {
      site: location.origin,
      page: PAGE_KEY,
      exportedAt: new Date().toISOString(),
      fields: FIELDS.map(f => ({
        id: f.id,
        label: f.label,
        value: state.values[f.id] ?? '',
        path: state.bindings[f.id] ?? ''
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `deploy-draft-${(PAGE_KEY === '/' ? 'home' : PAGE_KEY.replace(/\//g, '_'))}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  copyBtn.addEventListener('click', async () => {
    const payload = {
      site: location.origin,
      page: PAGE_KEY,
      exportedAt: new Date().toISOString(),
      fields: FIELDS.map(f => ({
        id: f.id,
        label: f.label,
        value: state.values[f.id] ?? '',
        path: state.bindings[f.id] ?? ''
      }))
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
    if (!confirm('确认清空本页沙盘绑定和草稿？')) return;
    localStorage.removeItem(KEY);
    location.reload();
  });

  window.addEventListener('scroll', applySaved, { passive: true });
  window.addEventListener('resize', applySaved);

  load();
  applySaved();
  refreshList();
})();
