import * as webVitals from 'web-vitals';
import { SerializedPageMetrics } from '../src/types';

const origin = process.env.PUBLIC_ORIGIN;
const script = window.document.querySelector(
  `script[src="${origin}/analytics.js"]`
);

const property = script!.getAttribute('data-property')!;

let sessionStartTime = Date.now();
let dataSent = false;

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

const networkInfo =
  navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const connection = networkInfo?.effectiveType;

const data: SerializedPageMetrics = {
  property,
  url: window.location.href,
  connection,
  offset: 0,
};

function reportMetric(metric: webVitals.Metric) {
  data[metric.name] = metric.value;
}

function sendData() {
  if (dataSent) return;
  dataSent = true;
  data.offset = sessionStartTime - Date.now();
  const collectUrl = `${origin}/api/collect`;
  const serializedData = JSON.stringify(data);
  if (navigator.sendBeacon) {
    return navigator.sendBeacon(collectUrl, serializedData);
  } else {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', collectUrl);
    xhr.send(serializedData);
  }
}

webVitals.getCLS(reportMetric, true);
webVitals.getFCP(reportMetric, true);
webVitals.getFID(reportMetric, true);
webVitals.getLCP(reportMetric, true);
webVitals.getTTFB(reportMetric);

window.addEventListener('pagehide', sendData);

// function pageView() {
//   sendBeacon({
//     property: property,
//     name: 'pageview',
//     referrer: window.document.referrer,
//     url: window.location.href,
//   });
// }
//
// pageView();
//
// if (window.history) {
//   const originalPushState = window.history.pushState;
//   window.history.pushState = function () {
//     originalPushState.apply(
//       this,
//       (arguments as unknown) as Parameters<typeof window.history.pushState>
//     );
//     pageView();
//   };
// }
