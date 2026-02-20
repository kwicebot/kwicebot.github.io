(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('sandbox') !== '1') return;

  const KEY = 'blog-sandbox-edits-v2:' + location.pathname;

  const style = document.createElement('style');
  style.textContent = `
    .sb-editable-hover { outline: 1px dashed #4f7cff; cursor: text !important; }
    .sb-toolbar {
      position: fixed; right: 16px; bottom: 16px; z-index: 99999;
      display: flex; gap: 8px; flex-wrap: wrap; max-width: 70vw;
      background: rgba(17,17,17,.92); color: #fff; padding: 10px;
      border-radius: 12px; font-size: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
    }
    .sb-toolbar button {
      border: 0; border-radius: 8px; padding: 6px 10px; cursor: pointer;
      background: #2b3a67; color: #fff;
    }
    .sb-toolbar .danger { background: #8b2f2f; }
    [contenteditable='true'] { outline: 2px solid #4f7cff !important; background: rgba(79,124,255,.08); }
  `;
  document.head.appendChild(style);

  let lockEdit = false;
  let currentEditing = null;

  const toolbar = document.createElement('div');
  toolbar.className = 'sb-toolbar';
  toolbar.innerHTML = `
    <span>Sandbox编辑模式</span>
    <button id="sb-lock">锁定：关</button>
    <button id="sb-export">导出草稿</button>
    <button id="sb-copy">复制草稿JSON</button>
    <button id="sb-clear" class="danger">清空本页草稿</button>
  `;
  document.body.appendChild(toolbar);

  const lockBtn = toolbar.querySelector('#sb-lock');
  const exportBtn = toolbar.querySelector('#sb-export');
  const copyBtn = toolbar.querySelector('#sb-copy');
  const clearBtn = toolbar.querySelector('#sb-clear');

  function isEditableTextElement(el) {
    if (!el || el.closest('.sb-toolbar')) return false;
    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return false;
    const tag = el.tagName;
    const blocked = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'PATH', 'INPUT', 'TEXTAREA', 'SELECT'];
    if (blocked.includes(tag)) return false;
    return (el.textContent || '').trim().length > 0;
  }

  function getPath(el) {
    if (!el || el === document.body) return '/html/body';
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let i = 1;
      let sib = el;
      while ((sib = sib.previousElementSibling)) {
        if (sib.tagName === el.tagName) i++;
      }
      parts.unshift(el.tagName.toLowerCase() + '[' + i + ']');
      el = el.parentElement;
    }
    return '/html/body/' + parts.join('/');
  }

  function findByPath(path) {
    try {
      const xp = path.replace('/html/body/', '').split('/').filter(Boolean);
      let node = document.body;
      for (const seg of xp) {
        const m = seg.match(/^([a-z0-9-]+)\[(\d+)\]$/i);
        if (!m) return null;
        const tag = m[1].toUpperCase();
        const idx = Number(m[2]);
        let c = 0;
        let found = null;
        for (const child of node.children) {
          if (child.tagName === tag) {
            c++;
            if (c === idx) { found = child; break; }
          }
        }
        if (!found) return null;
        node = found;
      }
      return node;
    } catch { return null; }
  }

  function readEdits() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }

  function writeEdits(edits) {
    localStorage.setItem(KEY, JSON.stringify(edits));
  }

  function loadEdits() {
    const edits = readEdits();
    Object.entries(edits).forEach(([path, text]) => {
      const el = findByPath(path);
      if (el) el.textContent = text;
    });
  }

  function saveEdit(el) {
    const edits = readEdits();
    edits[getPath(el)] = el.textContent;
    writeEdits(edits);
  }

  function beginEdit(el) {
    if (lockEdit) return;
    if (currentEditing && currentEditing !== el) endEdit(currentEditing);
    currentEditing = el;
    el.setAttribute('contenteditable', 'true');
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function endEdit(el) {
    if (!el) return;
    el.removeAttribute('contenteditable');
    saveEdit(el);
    currentEditing = null;
  }

  // 关键：拦截链接与点击行为，避免触发原站点击效果
  document.addEventListener('click', (e) => {
    if (e.target.closest('.sb-toolbar')) return;
    if (currentEditing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const clickable = e.target.closest('a,button,[role="button"],.menu-item,.nav-item');
    if (clickable) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('dblclick', (e) => {
    if (e.target.closest('.sb-toolbar')) return;
    const el = e.target;
    if (!isEditableTextElement(el)) return;
    e.preventDefault();
    e.stopPropagation();
    beginEdit(el);
  }, true);

  document.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (isEditableTextElement(el) && !lockEdit) el.classList.add('sb-editable-hover');
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target;
    if (el && el.classList) el.classList.remove('sb-editable-hover');
  });

  document.addEventListener('blur', (e) => {
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute('contenteditable') === 'true') {
      endEdit(el);
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentEditing) currentEditing.blur();
  });

  lockBtn.addEventListener('click', () => {
    lockEdit = !lockEdit;
    lockBtn.textContent = `锁定：${lockEdit ? '开' : '关'}`;
    if (lockEdit && currentEditing) currentEditing.blur();
  });

  exportBtn.addEventListener('click', () => {
    const payload = {
      page: location.pathname,
      savedAt: new Date().toISOString(),
      edits: readEdits()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sandbox-edits-${location.pathname.replace(/\//g, '_') || 'home'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  copyBtn.addEventListener('click', async () => {
    const payload = {
      page: location.pathname,
      savedAt: new Date().toISOString(),
      edits: readEdits()
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      copyBtn.textContent = '已复制';
      setTimeout(() => (copyBtn.textContent = '复制草稿JSON'), 1200);
    } catch {
      alert('复制失败，请用“导出草稿”按钮。');
    }
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('确认清空本页沙盘改动？')) return;
    localStorage.removeItem(KEY);
    location.reload();
  });

  loadEdits();
})();
