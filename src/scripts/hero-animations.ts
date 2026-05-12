import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

function initScrollExit() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const exitTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  // Scroll indicator — exits first (first 30% of scroll)
  exitTl.to('[data-hero-scroll]', { opacity: 0, duration: 0.3, ease: 'none' }, 0);

  // Name — fastest exit (floats up)
  exitTl.to('[data-hero-firstname], [data-hero-lastname]', {
    y: -80, opacity: 0, duration: 0.6, ease: 'none',
  }, 0);

  // Amber line — stretches to full viewport width and fades
  exitTl.to('[data-hero-line]', {
    scaleX: 20, opacity: 0, duration: 1.0, ease: 'none',
  }, 0);

  // Role + summary — medium speed
  exitTl.to('[data-hero-role], [data-hero-summary]', {
    y: -40, opacity: 0, duration: 0.7, ease: 'none',
  }, 0.1);

  // Status badge
  exitTl.to('[data-hero-badge]', { opacity: 0, duration: 0.7, ease: 'none' }, 0.1);

  // Orbiting dots — expand outward
  exitTl.to('[data-hero-orbits]', {
    scale: 1.5, opacity: 0, duration: 0.8, ease: 'none',
  }, 0.1);

  // Aurora canvas — subtle zoom-blur (applied via CSS transform on the canvas/container element)
  const auroraEl = document.querySelector('[data-hero-dots-canvas]');
  if (auroraEl) {
    exitTl.to(auroraEl, {
      scale: 1.05, filter: 'blur(4px)', duration: 1.0, ease: 'none',
    }, 0);
  }
}

export function initHeroAnimations(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Ensure all hero elements are visible
    document.querySelectorAll('.hero-initial-hidden').forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
    });
    return;
  }

  const badge   = document.querySelector('[data-hero-badge]') as HTMLElement | null;
  const first   = document.querySelector('[data-hero-firstname]') as HTMLElement | null;
  const last    = document.querySelector('[data-hero-lastname]') as HTMLElement | null;
  const line    = document.querySelector('[data-hero-line]') as HTMLElement | null;
  const role    = document.querySelector('[data-hero-role]') as HTMLElement | null;
  const summary = document.querySelector('[data-hero-summary]') as HTMLElement | null;
  const scroll  = document.querySelector('[data-hero-scroll]') as HTMLElement | null;

  if (!first || !last) return;

  // Remove shimmer before SplitType splits — `-webkit-text-fill-color: transparent` on the parent
  // makes chars inherit transparent fill but not the gradient, rendering them invisible during GSAP animation
  first.classList.remove('hero-name-shimmer');
  last.classList.remove('hero-name-shimmer');

  // Split name chars for animation
  const firstSplit = new SplitType(first, { types: 'chars' });
  const lastSplit  = new SplitType(last,  { types: 'chars' });

  // Without shimmer class, chars inherit body text color — set explicit gold so entrance matches
  // the shimmer gradient's dominant color for a seamless handoff
  [...(firstSplit.chars || []), ...(lastSplit.chars || [])].forEach(c => {
    (c as HTMLElement).style.color = 'var(--color-accent-primary)';
    (c as HTMLElement).style.webkitTextFillColor = 'inherit';
  });

  // Set initial states
  if (badge)   gsap.set(badge,   { opacity: 0, scale: 0.9 });
  // Parent spans must be visible — individual chars control the entrance visibility
  gsap.set([first, last], { opacity: 1 });
  if (firstSplit.chars) gsap.set(firstSplit.chars, { opacity: 0, y: 40, filter: 'blur(12px)' });
  if (lastSplit.chars)  gsap.set(lastSplit.chars,  { opacity: 0, y: 40, filter: 'blur(12px)' });
  if (line)    gsap.set(line,    { scaleX: 0, transformOrigin: 'left center' });
  if (role)    gsap.set(role,    { opacity: 0, y: 20 });
  if (summary) gsap.set(summary, { opacity: 0, y: 20 });
  if (scroll)  gsap.set(scroll,  { opacity: 0 });

  const tl = gsap.timeline({
    delay: 0.15,
    onComplete: () => {
      // Revert SplitType so background-clip:text shimmer works on restored text nodes
      firstSplit.revert();
      lastSplit.revert();
      // Re-add shimmer class — revert() restores innerHTML only, not classList
      first!.classList.add('hero-name-shimmer');
      last!.classList.add('hero-name-shimmer');
      // Keep opacity: 1 inline to override .hero-initial-hidden CSS class
      gsap.set([first, last], { opacity: 1, clearProps: 'filter,y' });

      // Bind scroll-exit after entrance is done (prevents entrance/exit conflict)
      initScrollExit();
    },
  });

  // 1. Badge
  if (badge) {
    tl.to(badge, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' });
  }

  // 2. First name chars — blur-reveal from below
  if (firstSplit.chars && firstSplit.chars.length > 0) {
    tl.to(firstSplit.chars, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.55, stagger: 0.038, ease: 'power3.out',
    }, '+=0.05');
  }

  // 3. Last name chars — overlaps with first name
  if (lastSplit.chars && lastSplit.chars.length > 0) {
    tl.to(lastSplit.chars, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.55, stagger: 0.038, ease: 'power3.out',
    }, '-=0.38');
  }

  // 4. Amber line draws from left
  if (line) {
    tl.to(line, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, '-=0.15');
  }

  // 5. Role text
  if (role) {
    tl.to(role, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1');
  }

  // 6. Summary
  if (summary) {
    tl.to(summary, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.1');
  }

  // 7. Scroll indicator
  if (scroll) {
    tl.to(scroll, { opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.15');
  }
}
