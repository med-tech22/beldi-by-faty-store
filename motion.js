/* BELDI BY FATY — lightweight motion controller */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.heroimg');

  if (!reduceMotion) body.classList.add('motion-ready');

  // Scroll progress and compact back-to-top action.
  const progress = document.createElement('div');
  progress.className = 'motion-progress';
  progress.setAttribute('aria-hidden', 'true');
  body.appendChild(progress);

  const topButton = document.createElement('button');
  topButton.type = 'button';
  topButton.className = 'motion-top';
  topButton.setAttribute('aria-label', 'العودة إلى أعلى الصفحة');
  topButton.title = 'العودة إلى الأعلى';
  topButton.textContent = '↑';
  body.appendChild(topButton);
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  let scrollQueued = false;
  const updateScrollUI = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const amount = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    progress.style.transform = `scaleX(${amount})`;
    nav?.classList.toggle('is-scrolled', window.scrollY > 12);
    topButton.classList.toggle('is-visible', window.scrollY > 520);
    scrollQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  updateScrollUI();

  // Reveal-on-scroll with a safe visible fallback.
  let revealObserver = null;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
  }

  const observeReveal = (element, index = 0) => {
    if (!element || element.dataset.motionObserved === '1') return;
    element.dataset.motionObserved = '1';
    element.classList.add('motion-reveal');
    element.style.setProperty('--motion-delay', `${Math.min(index, 7) * 75}ms`);
    if (reduceMotion || !revealObserver) {
      element.classList.add('is-visible');
    } else {
      revealObserver.observe(element);
    }
  };

  const enhance = (root = document) => {
    const groups = [
      ['.sectionhead', 0],
      ['.categorytile', 0],
      ['.product', 0],
      ['.collection-block', 0],
      ['.collection-title', 0],
      ['.featurein > div', 0],
      ['.about > img', 0],
      ['.about > div', 1],
      ['.footer > img', 0]
    ];
    groups.forEach(([selector]) => {
      root.querySelectorAll?.(selector).forEach((el, index) => observeReveal(el, index));
    });
  };

  enhance();

  // Product/category content is rendered asynchronously; enhance new cards too.
  const dynamicAreas = ['#products', '#categoryTiles', '#categoryCollections']
    .map(selector => document.querySelector(selector)).filter(Boolean);
  if ('MutationObserver' in window) {
    const contentObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('.product, .categorytile, .collection-block, .collection-title')) observeReveal(node, 0);
        enhance(node);
      }));
    });
    dynamicAreas.forEach(area => contentObserver.observe(area, { childList: true, subtree: true }));
  }

  // Subtle 3D product tilt on desktop pointers only.
  const attachTilt = card => {
    if (!finePointer || reduceMotion || card.dataset.tiltReady === '1') return;
    card.dataset.tiltReady = '1';
    let frame = 0;
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 6}deg`);
        card.style.setProperty('--shine-x', `${x * 100}%`);
        card.style.setProperty('--shine-y', `${y * 100}%`);
        card.classList.add('is-tilting');
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      card.classList.remove('is-tilting');
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    });
  };
  const attachDynamicTilt = root => root.querySelectorAll?.('.product').forEach(attachTilt);
  attachDynamicTilt(document);
  if ('MutationObserver' in window) {
    const tiltObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches?.('.product')) attachTilt(node);
      attachDynamicTilt(node);
    })));
    dynamicAreas.forEach(area => tiltObserver.observe(area, { childList: true, subtree: true }));
  }

  // Hero image parallax is intentionally tiny so the copy remains calm and readable.
  if (hero && finePointer && !reduceMotion) {
    hero.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      const dx = (event.clientX - rect.left) / rect.width - .5;
      const dy = (event.clientY - rect.top) / rect.height - .5;
      hero.style.setProperty('--hero-x', `${dx * -9}px`);
      hero.style.setProperty('--hero-y', `${dy * -7}px`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--hero-x', '0px');
      hero.style.setProperty('--hero-y', '0px');
    });
  }

  // Small magnetic response for primary actions.
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.heroBtns .btn, .navactions .btn').forEach(control => {
      control.classList.add('motion-magnetic');
      control.addEventListener('pointermove', event => {
        const rect = control.getBoundingClientRect();
        const dx = event.clientX - rect.left - rect.width / 2;
        const dy = event.clientY - rect.top - rect.height / 2;
        control.style.setProperty('--mag-x', `${dx * .075}px`);
        control.style.setProperty('--mag-y', `${dy * .12}px`);
      }, { passive: true });
      control.addEventListener('pointerleave', () => {
        control.style.removeProperty('--mag-x');
        control.style.removeProperty('--mag-y');
      });
    });
  }

  // Ripple micro-interaction for buttons and category filters.
  if (!reduceMotion) {
    document.addEventListener('click', event => {
      const control = event.target.closest?.('.btn, .filter');
      if (!control || control.disabled) return;
      const rect = control.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'motion-ripple';
      ripple.style.left = `${event.clientX ? event.clientX - rect.left : rect.width / 2}px`;
      ripple.style.top = `${event.clientY ? event.clientY - rect.top : rect.height / 2}px`;
      control.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  }
})();
