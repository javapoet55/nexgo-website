// The project API key is public browser configuration, not an account secret.
(function () {
  if (!window.amplitude || window.nexdoAmplitudeInitialized) return;
  try {
    if (window.sessionReplay && window.sessionReplay.plugin) {
      window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
    }
    window.amplitude.init('a2b6d5293c576970bb6251cbececb5bc', {
      fetchRemoteConfig: true,
      autocapture: true
    });
    window.nexdoAmplitudeInitialized = true;
    // Preserve existing named CTA events alongside automatic interaction tracking.
    // Autocapture owns page views, so don't duplicate the legacy page-view hooks.
    document.addEventListener('nexdo:track', function (event) {
      var detail = event.detail;
      if (!detail || typeof detail.event !== 'string' || /_page_view$/.test(detail.event)) return;
      window.amplitude.track(detail.event, { path: location.pathname });
    });
  } catch (error) {
    // Analytics availability must never prevent the marketing site from working.
    console.warn('NexDo analytics could not initialize.');
  }
})();
