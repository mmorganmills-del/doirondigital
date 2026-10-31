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
    var flash = booth.querySelector('.flash');
    var pol = booth.querySelector('.pol--live');
    var cap = pol.querySelector('.pol__cap');
    var caps = ['looking like our dream client', "your feed's new glow up", 'okay, frame that one'];
    var COUNTDOWN = 2000; // ring tightens for 2s, then snap
    var n = 0, last = -Infinity, busy = false, timers = [];
    var counting = false, cdSource = null, cdTimer = null, easeTimer = null, lastPtr = 'mouse';

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
      softFlash();
      later(function () { booth.dataset.state = 'developing'; }, 300);
      later(function () { live.textContent = 'Photo taken'; }, 900);
      later(function () { booth.dataset.state = 'done'; busy = false; }, 4100);
    }

    function softFlash() {
      // a brief cream glow centred on the camera ring: peak .3 opacity, 360ms, never full-screen
      if (!flash || !flash.animate) return;
      var fb = flash.getBoundingClientRect(), cb = cam.getBoundingClientRect();
      flash.style.setProperty('--fx', (cb.left + cb.width / 2 - fb.left) + 'px');
      flash.style.setProperty('--fy', (cb.top + cb.height * (190 / 470) - fb.top) + 'px'); // ring centre in the 360x470 camera art
      flash.style.setProperty('--fr', Math.round(cb.width * 1.6) + 'px');
      flash.animate([{ opacity: 0 }, { opacity: .3, offset: .3 }, { opacity: 0 }], { duration: 360, easing: 'ease-out' });
    }

    function easeBack() {
      booth.classList.remove('is-counting');
      booth.classList.add('is-easing');
      clearTimeout(easeTimer);
      easeTimer = setTimeout(function () { booth.classList.remove('is-easing'); }, 620);
    }

    function startCountdown(source) {
      if (counting || busy || performance.now() - last < 1500) return; // no retrigger mid-countdown or mid-snap
      counting = true; cdSource = source;
      clearTimeout(easeTimer);
      // stop the breathing loop first and commit that style, otherwise Chrome skips the transition
      // on a property that a CSS animation was driving and the ring would jump straight to small
      booth.classList.add('is-easing');
      void cam.querySelector('#dd-ring').getBoundingClientRect();
      booth.classList.remove('is-easing');
      booth.classList.add('is-counting');
      cdTimer = setTimeout(function () {
        counting = false; cdSource = null;
        easeBack();
        snap();
      }, COUNTDOWN);
    }

    function cancelCountdown() {
      if (!counting) return;
      clearTimeout(cdTimer);
      counting = false; cdSource = null;
      easeBack(); // ring eases back to full size, no snap
    }

    cam.addEventListener('pointerdown', function (e) { lastPtr = e.pointerType || 'mouse'; });
    cam.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') startCountdown('hover');
    });
    cam.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse' && (cdSource === 'hover' || cdSource === 'click')) cancelCountdown();
    });
    // tap, mouse click, Enter and Space all fire click on the native <button>
    cam.addEventListener('click', function (e) {
      var src = e.detail === 0 ? 'key' : (lastPtr === 'mouse' ? 'click' : 'tap');
      if (counting) {
        if (cdSource === 'hover' && src === 'click') return; // clicking while the hover countdown runs just lets it finish
        cancelCountdown(); // second tap / second key press cancels
        return;
      }
      startCountdown(src);
    });
    // a tap or click anywhere else cancels; so does moving keyboard focus away
    document.addEventListener('pointerdown', function (e) {
      if (counting && !cam.contains(e.target)) cancelCountdown();
    });
    cam.addEventListener('blur', function () { if (counting && cdSource === 'key') cancelCountdown(); });
    again.addEventListener('click', function (e) {
      last = -Infinity;
      if (e.detail === 0) cam.focus(); // keyboard activation: return focus to the camera
      startCountdown(e.detail === 0 ? 'key' : 'tap');
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
