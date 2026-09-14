(function () {
  'use strict';

  const frameCount = 20;
  const framePath = index =>
    `/assets/ui/frame-sequence/frame-${String(index).padStart(2, '0')}.png`;
  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startFrameAnimation(node) {
    const images = Array.from(node.querySelectorAll('[data-frame-image]'));
    if (!images.length) return;

    let frame = 1;
    let activeImage = 0;
    let timer = null;
    const speed = Math.max(70, Number(node.dataset.frameSpeed) || 100);
    const finalHold = Math.max(3000, Number(node.dataset.frameFinalHold) || 3000);

    const showFrame = () => {
      const nextImage = images.length > 1 ? (activeImage === 0 ? 1 : 0) : 0;
      images[nextImage].src = framePath(frame);
      if (images.length > 1) {
        images[nextImage].classList.add('is-visible');
        images[activeImage].classList.remove('is-visible');
        activeImage = nextImage;
      }
      const isFinalFrame = frame === frameCount;
      frame = isFinalFrame ? 1 : frame + 1;
      timer = window.setTimeout(showFrame, isFinalFrame ? finalHold : speed);
    };

    images.forEach(image => {
      image.src = framePath(1);
    });
    if (!reducedMotion) showFrame();
    node.__stopFrameAnimation = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };
  }

  function init() {
    // Load the complete sequence early so the first loop does not stutter.
    for (let index = 1; index <= frameCount; index += 1) {
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = framePath(index);
    }

    const animations = document.querySelectorAll('[data-frame-animation]');
    animations.forEach(startFrameAnimation);

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();