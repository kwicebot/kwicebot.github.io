(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('sandbox') !== '1') return;

  const KEY = 'blog-sandbox-edits-v1:' + location.pathname;

  const style = document.createElement('style');
  style.textContent = `
    .sb-editable-hover { outline: 1px dashed #4f7cff; cursor: text; }
    .sb-badge { position: fixed; right: 16px; bottom: 16px; z-index: 99999; background:#111; color:#fff; padding:8px 10px; border-radius:10px; font-size:12px; opacity:.9; }
  `;
  document.head.appendChild(style);

  const badge = document.createElement('div');
  badge.className = 'sb-badge';
  badge.textContent = 'Sandbox编辑模式已开启：双击任意文字修改';
  document.body.appendChild(badge);

  function isEditableTextElement(el) {
    if (!el || el.closest('[contenteditable="true"]')) return false;
    const tag = el.tagName;
    const blocked = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'PATH', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
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

  function loadEdits() {
    let edits = {};
    try { edits = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
    Object.entries(edits).forEach(([path, text]) => {
      const el = findByPath(path);
      if (el) el.textContent = text;
    });
  }

  function saveEdit(el) {
    let edits = {};
    try { edits = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
    edits[getPath(el)] = el.textContent;
    localStorage.setItem(KEY, JSON.stringify(edits));
  }

  document.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (isEditableTextElement(el)) el.classList.add('sb-editable-hover');
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target;
    if (el && el.classList) el.classList.remove('sb-editable-hover');
  });

  document.addEventListener('dblclick', (e) => {
    const el = e.target;
    if (!isEditableTextElement(el)) return;
    e.preventDefault();
    el.setAttribute('contenteditable', 'true');
    el.focus();
    document.execCommand?.('selectAll', false);
  });

  document.addEventListener('blur', (e) => {
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute('contenteditable') === 'true') {
      el.removeAttribute('contenteditable');
      saveEdit(el);
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (active && active.getAttribute && active.getAttribute('contenteditable') === 'true') {
        active.blur();
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
      localStorage.removeItem(KEY);
      location.reload();
    }
  });

  loadEdits();
})();
