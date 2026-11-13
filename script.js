const menu = document.querySelector('#menu');

const sitePagePaths = new Set(
  ['./', 'index.html', 'qna.html', 'opening.html'].map(page => {
    const url = new URL(page, location.href);
    return url.origin + url.pathname;
  })
);

function canReturnToSitePage() {
  if (history.state?.openingComplete === true) return true;
  const previousIndex = window.navigation?.currentEntry?.index - 1;
  const previousUrl = window.navigation?.entries()[previousIndex]?.url || document.referrer;
  if (!previousUrl) return false;
  const url = new URL(previousUrl);
  return sitePagePaths.has(url.origin + url.pathname);
}

document.querySelectorAll('[data-history-back]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (history.length <= 1 || !canReturnToSitePage()) return;
    event.preventDefault();
    history.back();
  });
});
const toggle = document.querySelector('.menu-toggle');
const header = document.querySelector('.header');
const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('pageshow', updateHeader);
updateHeader();
toggle.addEventListener('click', () => { menu.showModal(); toggle.setAttribute('aria-expanded', 'true'); });
menu.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => {
  if (menu.open) menu.close();
  document.getElementById(button.dataset.dialog).showModal();
}));
menu.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    menu.close();
  });
});

// Keep the menu visible while a different document loads.
// A page restored from the back-forward cache should start with its menu closed.
window.addEventListener('pageshow', event => {
  if (event.persisted && menu.open) menu.close();
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));

// Content stays visible when JavaScript or motion support is unavailable.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
let photoObserver;
let curtain;
const finishIntro = () => {
  curtain?.remove();
  hero?.classList.remove('motion-intro', 'is-opening');
};
const showAllPhotos = () => {
  photoObserver?.disconnect();
  document.querySelectorAll('.photo').forEach(photo => photo.classList.remove('reveal-pending', 'reveal-ready'));
};

if (!reducedMotion.matches) {
  if ('IntersectionObserver' in window) {
    photoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.replace('reveal-pending', 'reveal-ready');
        photoObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.photo').forEach(photo => {
      photo.classList.add('reveal-pending');
      photoObserver.observe(photo);
    });
  }

  let introSeen = false;
  try { introSeen = sessionStorage.getItem('fannook-intro-seen') === '1'; } catch { /* Local file storage may be unavailable. */ }
  if (hero && !introSeen && window.scrollY <= 8 && (!location.hash || location.hash === '#home')) {
    try { sessionStorage.setItem('fannook-intro-seen', '1'); } catch { /* Motion still runs once per document. */ }
    curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = '<span class="curtain-panel curtain-left"></span><span class="curtain-panel curtain-right"></span>';
    hero.append(curtain);
    hero.classList.add('motion-intro');
    const photo = hero.querySelector('.hero-photo');
    Promise.race([
      Promise.all([photo.decode().catch(() => {}), document.fonts.ready]),
      new Promise(resolve => setTimeout(resolve, 500))
    ]).then(() => {
      if (reducedMotion.matches || !curtain.isConnected) return finishIntro();
      hero.classList.add('is-opening');
      setTimeout(finishIntro, 1100);
    });
    window.addEventListener('scroll', () => { if (window.scrollY > 8) finishIntro(); }, { passive: true });
  }
}
reducedMotion.addEventListener('change', event => {
  if (!event.matches) return;
  finishIntro();
  showAllPhotos();
});
window.addEventListener('pageshow', event => { if (event.persisted) { finishIntro(); showAllPhotos(); } });

const aboutSection = document.querySelector('.about');
let aboutTicking = false;

function updateAboutMotion() {
  if (!aboutSection || reducedMotion.matches) {
    aboutTicking = false;
    return;
  }
  const bounds = aboutSection.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / window.innerHeight));
  const isInReadingZone = bounds.top < window.innerHeight * 0.84 && bounds.bottom > window.innerHeight * 0.12;
  aboutSection.classList.toggle('is-visible', isInReadingZone);
  aboutSection.style.setProperty('--about-rise', `${-28 * progress}px`);
  aboutSection.style.setProperty('--about-scale', `${0.94 + (0.06 * progress)}`);
  aboutTicking = false;
}

function requestAboutMotion() {
  if (!aboutSection || aboutTicking) return;
  aboutTicking = true;
  window.requestAnimationFrame(updateAboutMotion);
}

if (aboutSection) {
  aboutSection.classList.add('scroll-about');
  window.addEventListener('scroll', requestAboutMotion, { passive: true });
  window.addEventListener('resize', requestAboutMotion);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      aboutSection.classList.add('is-visible');
      aboutSection.style.removeProperty('--about-rise');
      aboutSection.style.removeProperty('--about-scale');
    } else {
      requestAboutMotion();
    }
  });
  requestAboutMotion();
}

const openingSection = document.querySelector('#opening');
if (openingSection && !reducedMotion.matches && 'IntersectionObserver' in window) {
  openingSection.classList.add('is-awaiting-reveal');
  const openingObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        openingSection.classList.add('is-awaiting-reveal');
      } else if (entry.intersectionRatio >= 0.4) {
        openingSection.classList.remove('is-awaiting-reveal');
      }
    }
  }, { threshold: [0, 0.4] });
  openingObserver.observe(openingSection);
}

const openingForm = document.querySelector('#opening-form');
openingForm?.addEventListener('submit', event => {
  event.preventDefault();
  const status = openingForm.querySelector('.form-status');
  if (!openingForm.checkValidity()) {
    status.classList.remove('is-success');
    status.textContent = '이메일 주소와 필수 동의 항목을 확인해 주세요.';
    openingForm.reportValidity();
    return;
  }
  status.classList.add('is-success');
  status.textContent = '오픈 준비 중인 화면입니다. 입력한 정보는 저장되지 않았어요.';
});
