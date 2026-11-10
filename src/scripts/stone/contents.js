// "On this page" marks where you are (openspec stone-inner-pages, stone-article-layout): the link of
// the section being read, the last prose h2 whose top is above half the viewport's height, carries
// aria-current="true" (set in weight with a dot, stone.css); before the first h2 reaches that line
// no link is current. Read on scroll and resize, never on a timer.
const links = [...document.querySelectorAll('.art-toc a')];
const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));

if (links.length && heads.every(Boolean)) {
  let queued = false;
  const mark = () => {
    queued = false;
    const line = innerHeight / 2;
    let current = -1;
    heads.forEach((h, k) => { if (h.getBoundingClientRect().top < line) current = k; });
    links.forEach((a, k) => {
      if (k === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  const soon = () => { if (!queued) { queued = true; requestAnimationFrame(mark); } };
  addEventListener('scroll', soon, { passive: true });
  addEventListener('resize', soon);
  mark();
}
