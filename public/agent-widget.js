/*! Sawtify Agent Widget — <script src="https://VOTRE-DOMAINE/agent-widget.js" data-agent="votre-lien" async></script> */
(function () {
  if (window.__sawtifyAgentWidget) return;
  window.__sawtifyAgentWidget = true;

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) { if (all[i].getAttribute('data-agent')) { script = all[i]; break; } }
  }
  if (!script) return;
  var slug = (script.getAttribute('data-agent') || '').trim();
  if (!slug) { console.warn('[Sawtify] Attribut data-agent manquant.'); return; }

  var origin;
  try { origin = new URL(script.src, window.location.href).origin; } catch (e) { return; }
  var side = script.getAttribute('data-position') === 'left' ? 'left' : 'right';
  var lang = script.getAttribute('data-lang');
  lang = lang === 'fr' || lang === 'ar' ? lang : '';

  var open = false;
  var iframe = document.createElement('iframe');
  iframe.src = origin + '/widget/' + encodeURIComponent(slug) + '?side=' + side + (lang ? '&lang=' + lang : '') + '&host=' + encodeURIComponent(window.location.hostname);
  iframe.title = 'Assistant vocal Sawtify';
  iframe.setAttribute('allow', 'microphone; autoplay');
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('loading', 'lazy');

  function apply() {
    var w = window.innerWidth, h = window.innerHeight;
    var width = 84, height = 84;
    if (open) { width = Math.min(392, w - 16); height = Math.min(640, h - 16); }
    var s = iframe.style;
    s.cssText = 'position:fixed;bottom:' + (open ? 8 : 12) + 'px;' + side + ':' + (open ? 8 : 12) + 'px;width:' + width + 'px;height:' + height +
      'px;border:0;background:transparent;color-scheme:normal;z-index:2147483000;max-width:100vw;max-height:100vh;transition:width .25s ease,height .25s ease;';
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== 'sawtify-agent') return;
    open = !!data.open;
    apply();
  });
  window.addEventListener('resize', apply);

  function mount() { apply(); document.body.appendChild(iframe); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
