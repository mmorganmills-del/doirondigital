/* Doiron Digital concept sample: photo booth, mobile menu, front-end-only form. No libraries, no network calls. */
(function () {
  'use strict';
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Photo booth ---------- */
  var booth = document.getElementById('booth');
  if (booth) {
    var cam = booth.querySelector('.cam');
    var again = booth.querySelector('.again');
    var live = document.getElementById('live');
    var flash = document.querySelector('.hero .flash');
    var pol = booth.querySelector('.pol--live');
    var cap = pol.querySelector('.pol__cap');
    var caps = ['looking like our dream client', "your feed's new glow up", 'okay, frame that one'];
    var n = 0, last = -Infinity, busy = false, dwell = null, timers = [];

    // touch devices: show "tap to snap" (also flips on the first touch, for hybrid laptops/tablets)
    if (window.matchMedia('(hover: none)').matches) booth.classList.add('is-touch');
    booth.addEventListener('pointerdown', function (e) { booth.classList.toggle('is-touch', e.pointerType !== 'mouse'); });
    booth.dataset.state = 'idle'; // HTML ships in "done" so the no-JS view shows the developed print

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function pileUp() {
      // move a copy of the developed print onto the pile (max 3 prints including the live one)
      var piles = booth.querySelectorAll('.pol--pile');
      for (var i = 0; i < piles.length; i++) {
        var p = piles[i], k = +p.dataset.pile + 1;
        if (k > 2) { p.classList.add('is-out'); (function (el) { setTimeout(function () { el.remove(); }, 320); })(p); }
        else p.dataset.pile = k;
      }
      var c = pol.cloneNode(true);
      c.classList.remove('pol--live');
      c.classList.add('pol--pile');
      c.removeAttribute('id');
      c.setAttribute('aria-hidden', 'true');
      var img = c.querySelector('img'); if (img) img.alt = '';
      c.dataset.pile = '1';
      pol.parentNode.insertBefore(c, pol);
    }

    function snap() {
      var now = performance.now();
      if (busy || now - last < 1500) return;
      last = now; busy = true;
      clearTimeout(dwell);
      live.textContent = '';
      var wasDone = !pol.hidden && booth.dataset.state === 'done' && n > 0;
      var text = caps[n++ % caps.length];

      if (rm.matches) {
        // reduced motion: no flash, shutter, slide or develop; cross-fade (or caption swap) only
        if (wasDone) {
          cap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100 }).onfinish = function () {
            cap.textContent = text;
            cap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
          };
        } else { cap.textContent = text; }
        booth.dataset.state = 'done';
        live.textContent = 'Photo taken';
        busy = false;
        return;
      }

      if (wasDone) pileUp();
      booth.dataset.state = 'shutter';
      cap.textContent = text;
      if (flash && flash.animate) {
        flash.animate([{ opacity: 0 }, { opacity: .9, offset: .23 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
      }
      later(function () { booth.dataset.state = 'developing'; }, 300);
      later(function () { live.textContent = 'Photo taken'; }, 900);
      later(function () { booth.dataset.state = 'done'; busy = false; }, 4100);
    }

    cam.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (booth.dataset.state === 'idle' || booth.dataset.state === 'done') {
        if (!busy && booth.dataset.state === 'idle') booth.dataset.state = 'armed';
        clearTimeout(dwell);
        dwell = setTimeout(snap, 400);
      }
    });
    cam.addEventListener('pointerleave', function () {
      clearTimeout(dwell);
      if (booth.dataset.state === 'armed') booth.dataset.state = 'idle';
    });
    cam.addEventListener('click', snap); // tap, Enter and Space all fire click on a native <button>
    again.addEventListener('click', function (e) {
      last = -Infinity;
      snap();
      if (e.detail === 0) cam.focus(); // keyboard activation: return focus to the camera
    });
  }

  /* ---------- Mobile menu ---------- */
  var openBtn = document.querySelector('.hdr__menu');
  var sheet = document.getElementById('menu');
  if (openBtn && sheet) {
    var closeBtn = sheet.querySelector('.sheet__close');
    var lastBtn = sheet.querySelector('.btn');
    // everything outside the sheet (the sheet is a sibling of these, never inside them)
    var outside = document.querySelectorAll('body > header, body > main, body > footer');
    function trap(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && (document.activeElement === closeBtn || !sheet.contains(document.activeElement))) {
        e.preventDefault(); lastBtn.focus();
      } else if (!e.shiftKey && (document.activeElement === lastBtn || !sheet.contains(document.activeElement))) {
        e.preventDefault(); closeBtn.focus();
      }
    }
    function setMenu(open, keepFocus) {
      sheet.hidden = !open;
      openBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
      for (var i = 0; i < outside.length; i++) {
        if (open) outside[i].setAttribute('inert', ''); else outside[i].removeAttribute('inert');
      }
      if (open) document.addEventListener('keydown', trap); else document.removeEventListener('keydown', trap);
      if (!keepFocus) (open ? sheet.querySelector('nav a') : openBtn).focus();
    }
    openBtn.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false); });
    // a nav link closes the sheet but keeps focus where the anchor jump puts it
    sheet.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]')) setMenu(false, true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) setMenu(false); });
  }

  /* ---------- Contact form: front-end only, never sends ---------- */
  var form = document.getElementById('consult-form');
  if (form) {
    var msg = document.getElementById('form-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault(); // concept preview: no submission, no network request
      if (!form.checkValidity()) { form.reportValidity(); return; }
      msg.hidden = false;
      msg.focus();
      form.reset();
    });
  }
})();
