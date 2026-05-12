import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

function scrambleOnUpdate(chars: Element[], finalChars: (string | null)[]) {
  return function(this: gsap.core.Tween) {
    const progress = this.progress();
    const resolved = Math.floor(progress * chars.length);
    chars.forEach((c, j) => {
      if (!finalChars[j]?.trim()) return;
      c.textContent = j < resolved
        ? finalChars[j]
        : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    });
  };
}

function initScrollExit() {
  if (!document.getElementById('hero')) return;

  const exitTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  exitTl.to('[data-hero-scroll]', { opacity: 0, duration: 0.3, ease: 'none' }, 0);
  exitTl.to('[data-hero-firstname], [data-hero-lastname]', { y: -80, opacity: 0, duration: 0.6, ease: 'none' }, 0);
  exitTl.to('[data-hero-line]', { scaleX: 20, opacity: 0, duration: 1.0, ease: 'none' }, 0);
  exitTl.to('[data-hero-role], [data-hero-summary]', { y: -40, opacity: 0, duration: 0.7, ease: 'none' }, 0.1);
  exitTl.to('[data-hero-badge]', { opacity: 0, duration: 0.7, ease: 'none' }, 0.1);
  exitTl.to('[data-hero-orbits]', { scale: 1.5, opacity: 0, duration: 0.8, ease: 'none' }, 0.1);
  exitTl.to('[data-hero-glow]', { opacity: 0, duration: 0.6, ease: 'none' }, 0.1);
}

export function initHeroAnimations(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.hero-initial-hidden').forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
    });
    return;
  }

  const badge   = document.querySelector('[data-hero-badge]')    as HTMLElement | null;
  const glow    = document.querySelector('[data-hero-glow]')     as HTMLElement | null;
  const first   = document.querySelector('[data-hero-firstname]') as HTMLElement | null;
  const last    = document.querySelector('[data-hero-lastname]')  as HTMLElement | null;
  const line    = document.querySelector('[data-hero-line]')     as HTMLElement | null;
  const role    = document.querySelector('[data-hero-role]')     as HTMLElement | null;
  const summary = document.querySelector('[data-hero-summary]')  as HTMLElement | null;
  const scroll  = document.querySelector('[data-hero-scroll]')   as HTMLElement | null;

  if (!first || !last) return;

  // Override shimmer's transparent fill with resolved solid gold — gradient stays present but hidden.
  // Shimmer class is never removed, so the gradient is active from the start.
  const accentColor = getComputedStyle(first).getPropertyValue('--color-accent-primary').trim();
  first.style.webkitTextFillColor = accentColor;
  last.style.webkitTextFillColor  = accentColor;

  const firstSplit = new SplitType(first, { types: 'chars' });
  const lastSplit  = new SplitType(last,  { types: 'chars' });

  // Store final text and lock char widths before scramble to prevent layout jitter
  const firstFinal = firstSplit.chars?.map(c => c.textContent) ?? [];
  const lastFinal  = lastSplit.chars?.map(c => c.textContent)  ?? [];

  [...(firstSplit.chars ?? []), ...(lastSplit.chars ?? [])].forEach(c => {
    const el = c as HTMLElement;
    el.style.color = 'var(--color-accent-primary)';
    el.style.webkitTextFillColor = 'inherit';
    el.style.display = 'inline-block';
    el.style.width = `${el.offsetWidth}px`;
  });

  // Set chars to random glyphs for scramble start
  firstSplit.chars?.forEach((c, i) => {
    if (firstFinal[i]?.trim()) c.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  });
  lastSplit.chars?.forEach((c, i) => {
    if (lastFinal[i]?.trim()) c.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  });

  // Initial states
  if (badge)  gsap.set(badge,  { opacity: 0, scale: 0.9 });
  if (glow)   gsap.set(glow,   { opacity: 0 });
  gsap.set([first, last], { opacity: 1 });
  if (firstSplit.chars) gsap.set(firstSplit.chars, { opacity: 0, y: 40, filter: 'blur(16px)' });
  if (lastSplit.chars)  gsap.set(lastSplit.chars,  { opacity: 0, y: 40, filter: 'blur(16px)' });
  if (line)    gsap.set(line,    { scaleX: 0, transformOrigin: 'left center' });
  if (role)    gsap.set(role,    { opacity: 0, y: 20 });
  if (summary) gsap.set(summary, { opacity: 0, y: 20 });
  if (scroll)  gsap.set(scroll,  { opacity: 0 });

  const tl = gsap.timeline({
    delay: 0.15,
    onComplete: () => {
      // SplitType revert restores innerHTML; inline styles on first/last survive since they're on the element
      firstSplit.revert();
      lastSplit.revert();
      gsap.set([first, last], { opacity: 1, clearProps: 'filter,y' });
      initScrollExit(); // targets opacity/transform — no conflict with text-fill-color cross-fade
      // Cross-fade: solid gold → transparent, gradually revealing shimmer gradient underneath
      gsap.to([first, last], {
        webkitTextFillColor: 'transparent',
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          first!.style.removeProperty('-webkit-text-fill-color');
          last!.style.removeProperty('-webkit-text-fill-color');
        },
      });
    },
  });

  // 1. Badge + glow fade in together
  if (badge) tl.to(badge, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' });
  if (glow)  tl.to(glow,  { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0);

  // 2. First name — blur-reveal + scramble via onUpdate
  if (firstSplit.chars && firstSplit.chars.length > 0) {
    tl.to(firstSplit.chars, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.75, stagger: 0.038, ease: 'power3.out',
      onUpdate: scrambleOnUpdate(firstSplit.chars, firstFinal),
    }, '+=0.05');
  }

  // 3. Last name — overlaps with first
  if (lastSplit.chars && lastSplit.chars.length > 0) {
    tl.to(lastSplit.chars, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.75, stagger: 0.038, ease: 'power3.out',
      onUpdate: scrambleOnUpdate(lastSplit.chars, lastFinal),
    }, '-=0.38');
  }

  // 4. Amber line
  if (line) tl.to(line, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, '-=0.15');

  // 5. Role
  if (role) tl.to(role, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1');

  // 6. Summary
  if (summary) tl.to(summary, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.1');

  // 7. Scroll indicator
  if (scroll) tl.to(scroll, { opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.15');
}
