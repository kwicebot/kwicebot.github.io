var posts=["2026/02/18/hello-world/","2026/02/18/post-title/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };