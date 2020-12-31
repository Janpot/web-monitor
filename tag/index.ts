import * as webVitals from 'web-vitals';
import { SerializedPageMetrics } from '../src/types';

const origin = process.env.PUBLIC_ORIGIN;
const script = window.document.querySelector(
  `script[src="${origin}/analytics.js"], script[src="${origin}/tag.js"]`
);

const property = script!.getAttribute('data-property')!;

let sessionStartTime = Date.now();
let visibleStartTime = sessionStartTime;

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

interface NetworkInformation {
  effectiveType?: string;
}

function initPageview(
  referrer: string | undefined = document.referrer || undefined
): SerializedPageMetrics {
  const networkInfo =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  const connection = networkInfo?.effectiveType;

  return {
    property,
    url: window.location.href,
    referrer,
    connection,
    offset: 0,
    visible: 0,
  };
}

let pageview: SerializedPageMetrics = initPageview();

function reportMetric(metric: webVitals.Metric) {
  pageview[metric.name] = (pageview[metric.name] || 0) + metric.delta;
}

webVitals.getCLS(reportMetric, true);
webVitals.getFCP(reportMetric, true);
webVitals.getFID(reportMetric, true);
webVitals.getLCP(reportMetric, true);
webVitals.getTTFB(reportMetric);

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pageview.visible += Date.now() - visibleStartTime;
  } else if (document.visibilityState === 'visible') {
    visibleStartTime = Date.now();
  }
});

function sendPageview() {
  pageview.offset = sessionStartTime - Date.now();
  if (document.visibilityState === 'visible') {
    pageview.visible += Date.now() - visibleStartTime;
  }

  const collectUrl = `${origin}/api/collect`;
  const serializedData = JSON.stringify(pageview);

  pageview = initPageview(pageview.url);
  sessionStartTime = Date.now();
  visibleStartTime = sessionStartTime;

  if (navigator.sendBeacon) {
    return navigator.sendBeacon(collectUrl, serializedData);
  } else {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', collectUrl);
    xhr.send(serializedData);
  }
}

window.addEventListener('pagehide', sendPageview);
window.addEventListener('popstate', sendPageview);

if (window.history) {
  // we wrap pushstate to capture browserside navigations
  const originalPushState = window.history.pushState;
  window.history.pushState = function () {
    originalPushState.apply(
      this,
      (arguments as unknown) as Parameters<typeof window.history.pushState>
    );
    sendPageview();
  };
}
