(function(){
  if(location.pathname !== '/') return;
  if(document.querySelector('.kwice-notice-wrap')) return;
  const host = document.querySelector('header, #page-header, .nav-fixed') || document.body;
  const wrap = document.createElement('div');
  wrap.className = 'kwice-notice-wrap';
  wrap.innerHTML = `
    <a class="kwice-notice-badge" href="/essay/">即刻</a>
    <div class="kwice-notice-track"><span class="kwice-notice-marquee">第一次做自己的博客，有前人的基础还花了整整一天 ｜ 放弃幻想，保持理智 ｜ 欢迎来到 Kwice 的博客小屋</span></div>
  `;
  host.insertAdjacentElement('afterend', wrap);
})();
