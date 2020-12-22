import * as webVitals from 'web-vitals';
const origin = process.env.SCRIPT_ORIGIN;
const script = window.document.querySelector(
  `script[src="${origin}/analytics.js"]`
);
const property = script!.getAttribute('data-property')!;

interface Metric {
  /** property */
  p: string;
  /** type */
  t: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB';
  /** url */
  u: string;
  /** value */
  v: number;
  /** metric id */
  i: string;
}

interface PageView {
  /** property */
  p: string;
  /** type */
  t: 'pageview';
  /** referrer */
  r: string;
  /** url */
  u: string;
}

function sendBeacon(event: Metric | PageView) {
  const url = `${origin}/api/collect`;
  const data = JSON.stringify(event);
  if (navigator.sendBeacon) {
    return navigator.sendBeacon(url, data);
  } else {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.send(data);
  }
}

function reportMetric(metric: webVitals.Metric) {
  sendBeacon({
    p: property,
    t: metric.name,
    u: window.location.href,
    i: metric.id,
    v: metric.value,
  });
}

webVitals.getCLS(reportMetric);
webVitals.getFCP(reportMetric);
webVitals.getFID(reportMetric);
webVitals.getLCP(reportMetric);
webVitals.getTTFB(reportMetric);

function pageView() {
  sendBeacon({
    p: property,
    t: 'pageview',
    r: window.document.referrer,
    u: window.location.href,
  });
}

pageView();

if (window.history) {
  const originalPushState = window.history.pushState;
  window.history.pushState = function () {
    originalPushState.apply(
      this,
      (arguments as unknown) as Parameters<typeof window.history.pushState>
    );
    pageView();
  };
}
