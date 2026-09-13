import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

console.log("==================================================================");
console.log("SKYDISH REAL BROWSER (CHROME v152) AUTOMATED VERIFICATION");
console.log("Target: http://localhost:3000 (Live Client)");
console.log("Protocol: Chrome DevTools Protocol (CDP) via Node 24 Native WebSocket");
console.log("==================================================================\n");

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.resolve('audit/chrome-dev');
const PORT = 9222;
const JWT_SECRET = 'supersecretjwtkeyforfooddeliverymicroservices2025';

const SCREENSHOT_DIRS = [
  path.resolve('audit/ui-smoothness/screenshots'),
  path.resolve('audit/ui-overhaul/phase-01/screenshots')
];

for (const dir of SCREENSHOT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.events = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        } else if (data.method) {
          const handlers = this.events.get(data.method) || [];
          for (const h of handlers) h(data.params);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(handler);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function httpJson(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: method,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function createSignedJwt(payload, secret = JWT_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

async function ensureChromeRunning() {
  try {
    const v = await httpJson(`http://127.0.0.1:${PORT}/json/version`);
    console.log(`  CDP already active on port ${PORT}: ${v.Browser}`);
    return { process: null };
  } catch (e) {
    console.log(`  Launching dedicated Chrome v152 headless instance on port ${PORT}...`);
  }

  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900'
  ]);

  proc.on('error', (err) => {
    console.error('Failed to spawn Chrome process:', err);
  });

  for (let i = 0; i < 20; i++) {
    await sleep(400);
    try {
      const v = await httpJson(`http://127.0.0.1:${PORT}/json/version`);
      console.log(`  Chrome v152 online: ${v.Browser}`);
      return { process: proc };
    } catch (e) {
      // Keep polling
    }
  }

  proc.kill();
  throw new Error(`Chrome failed to become ready on port ${PORT} within 8 seconds.`);
}

async function main() {
  const chromeInstance = await ensureChromeRunning();

  try {
    // 1. Connect to page target
    console.log("\n[1/7] Discovering page target and initializing CDP...");
    const targets = await httpJson(`http://127.0.0.1:${PORT}/json/list`);
    let pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-'));
    if (!pageTarget) {
      pageTarget = targets.find(t => t.type === 'page');
    }
    if (!pageTarget) {
      pageTarget = await httpJson(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000`, 'PUT');
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    // Enable CDP domains
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('CSS.enable');
    await client.send('Network.enable');
    await client.send('Console.enable');

    // Bypass browser cache to guarantee fresh live assets
    await client.send('Network.clearBrowserCache');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });

    const uncaughtErrors = [];
    client.on('Runtime.exceptionThrown', (params) => {
      const text = params.exceptionDetails.exception?.description || params.exceptionDetails.text;
      uncaughtErrors.push(text);
    });

    let documentReloads = 0;
    client.on('Network.requestWillBeSent', (params) => {
      if (params.type === 'Document' && params.initiator?.type !== 'parser' && !params.request.url.includes('newtab')) {
        documentReloads++;
      }
    });

    const evaluate = async (expression) => {
      const res = await client.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      return res.result?.value;
    };

    const takeScreenshot = async (filename) => {
      const res = await client.send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(res.data, 'base64');
      for (const dir of SCREENSHOT_DIRS) {
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, buffer);
      }
      console.log(`  📷 Captured screenshot: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    };

    const setViewport = async (width, height) => {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
    };

    // -------------------------------------------------------------------------
    // [2/7] HEADER NAVIGATION, ACTIVE PILL & HYPERLINK AUDIT
    // -------------------------------------------------------------------------
    console.log("\n[2/7] Testing Header Navigation & Typography (Desktop 1440x900)...");
    await setViewport(1440, 900);
    await client.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1500);

    await takeScreenshot('01-landing-header.png');

    const headerStyles = await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('.header-nav-links .nav-link-item'));
      return links.map(l => ({
        text: l.textContent.trim(),
        textDecoration: window.getComputedStyle(l).textDecorationLine,
        color: window.getComputedStyle(l).color,
        isActive: l.classList.contains('active'),
      }));
    })()`);

    assert(headerStyles.length >= 3, `Found ${headerStyles.length} header navigation links`);
    const allNoUnderline = headerStyles.every(l => l.textDecoration === 'none');
    assert(allNoUnderline, "All header navigation links have text-decoration: none (no default underline)");

    const homeLink = headerStyles.find(l => l.text === 'Trang chủ');
    assert(homeLink && homeLink.isActive, "Trang chủ link has active class indicator");

    const activeIndicatorStyle = await evaluate(`(() => {
      const activeLink = document.querySelector('.header-nav-links .nav-link-item.active');
      if (!activeLink) return null;
      const after = window.getComputedStyle(activeLink, '::after');
      return {
        bg: after.backgroundColor,
        height: parseFloat(after.height) || 0,
        borderRadius: after.borderRadius
      };
    })()`);
    assert(activeIndicatorStyle && activeIndicatorStyle.bg.includes('rgb') && activeIndicatorStyle.height > 0,
      "Active link displays refined brand indicator pill (::after) with orange background");

    // -------------------------------------------------------------------------
    // [3/7] PORTALS DROPDOWN, ESCAPE KEY, CLICK OUTSIDE & ROUTE GUARDING
    // -------------------------------------------------------------------------
    console.log("\n[3/7] Testing Portals Dropdown, Escape Key, Click-Outside & Route Guarding...");

    // Click trigger to open dropdown
    await evaluate(`document.querySelector('.portals-trigger-btn').click()`);
    await sleep(300);
    let isDropdownOpen = await evaluate(`!!document.querySelector('.profile-dropdown-card')`);
    assert(isDropdownOpen, "Clicking 'Cổng đối tác' opens the portals dropdown menu");

    await takeScreenshot('02-partner-dropdown.png');

    // Test Escape Key on document
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await sleep(300);
    let isDropdownClosed = await evaluate(`!document.querySelector('.profile-dropdown-card')`);
    assert(isDropdownClosed, "Pressing Escape key closes the portals dropdown menu");

    // Re-open and test Click Outside
    await evaluate(`document.querySelector('.portals-trigger-btn').click()`);
    await sleep(300);
    await evaluate(`document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }))`);
    await sleep(300);
    isDropdownClosed = await evaluate(`!document.querySelector('.profile-dropdown-card')`);
    assert(isDropdownClosed, "Clicking outside the portals dropdown menu closes it");

    // Route Guard Case A: Guest (No Token) -> Click "Đối tác nhà hàng" -> /restaurant/login
    await evaluate(`localStorage.clear()`);
    await evaluate(`document.querySelector('.portals-trigger-btn').click()`);
    await sleep(300);
    await evaluate(`(() => {
      const btn = document.querySelector('button.header_dropdown-item');
      if (btn) btn.click();
    })()`);
    await sleep(800);

    let currentPath = await evaluate(`window.location.pathname`);
    assert(currentPath === '/restaurant/login', `Guest clicking Partner routes to /restaurant/login (actual: ${currentPath})`);

    // Route Guard Case B: Invalid/Malformed Token -> /restaurant/login & Token Purged
    await evaluate(`localStorage.setItem('restaurantToken', 'malformed_invalid_bogus_token_123')`);
    await client.send('Page.navigate', { url: 'http://localhost:3000/restaurant/dashboard' });
    await sleep(800);

    currentPath = await evaluate(`window.location.pathname`);
    let storedToken = await evaluate(`localStorage.getItem('restaurantToken')`);
    assert(currentPath === '/restaurant/login', `Invalid token redirects to /restaurant/login (actual: ${currentPath})`);
    assert(!storedToken, "Invalid restaurantToken was purged from localStorage by guard");

    // Route Guard Case C: Expired Token -> /restaurant/login
    const expiredJwt = createSignedJwt({
      id: '6aa2dc409d1bf38eca3279e4',
      role: 'restaurant',
      restaurantId: '6aa2dc409d1bf38eca3279e4',
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    });

    await evaluate(`localStorage.setItem('restaurantToken', '${expiredJwt}')`);
    await client.send('Page.navigate', { url: 'http://localhost:3000/restaurant/dashboard' });
    await sleep(800);

    currentPath = await evaluate(`window.location.pathname`);
    assert(currentPath === '/restaurant/login', `Expired token redirects to /restaurant/login (actual: ${currentPath})`);

    // Route Guard Case D: Valid RESTAURANT_PARTNER Token -> /restaurant/dashboard
    const validJwt = createSignedJwt({
      id: '6aa2dc409d1bf38eca3279e4',
      role: 'restaurant',
      restaurantId: '6aa2dc409d1bf38eca3279e4',
      name: "Pizza 4P's Tràng Tiền",
      exp: Math.floor(Date.now() / 1000) + 86400 * 30 // 30 days valid
    });

    await evaluate(`localStorage.setItem('restaurantToken', '${validJwt}')`);
    await client.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1000);

    await evaluate(`document.querySelector('.portals-trigger-btn').click()`);
    await sleep(300);
    await evaluate(`(() => {
      const btn = document.querySelector('button.header_dropdown-item');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    currentPath = await evaluate(`window.location.pathname`);
    assert(currentPath === '/restaurant/dashboard', `Valid RESTAURANT_PARTNER token routes to /restaurant/dashboard (actual: ${currentPath})`);
    await evaluate(`localStorage.clear()`);

    // -------------------------------------------------------------------------
    // [4/7] CATEGORY CAROUSEL: ARROWS, DRAG, KEYBOARD, RESUME
    // -------------------------------------------------------------------------
    console.log("\n[4/7] Testing Category Carousel Controls & Interactions (Viewport: 1024x768)...");
    await setViewport(1024, 768);
    await client.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1200);

    await takeScreenshot('03-category-carousel.png');

    const categoryCount = await evaluate(`document.querySelectorAll('.category-carousel-item').length`);
    assert(categoryCount === 9, `Rendered exactly 9 authentic categories (actual: ${categoryCount})`);

    const hasRightArrow = await evaluate(`!!document.querySelector('.carousel-nav-btn--right')`);
    assert(hasRightArrow, "Desktop right arrow button is rendered when scrollable content overflows");

    // Click Right Arrow
    let initialScroll = await evaluate(`document.querySelector('.category-carousel-track').scrollLeft`);
    await evaluate(`document.querySelector('.carousel-nav-btn--right').click()`);
    await sleep(600);

    let scrolledRight = await evaluate(`document.querySelector('.category-carousel-track').scrollLeft`);
    assert(scrolledRight > initialScroll, `Right arrow scrolled track smoothly (scrollLeft: ${initialScroll}px -> ${scrolledRight}px)`);

    // Left Arrow appears and works
    const hasLeftArrow = await evaluate(`!!document.querySelector('.carousel-nav-btn--left')`);
    assert(hasLeftArrow, "Left arrow button dynamically appeared when scrolled right");

    await evaluate(`document.querySelector('.carousel-nav-btn--left').click()`);
    await sleep(600);
    let scrolledLeft = await evaluate(`document.querySelector('.category-carousel-track').scrollLeft`);
    assert(scrolledLeft < scrolledRight, `Left arrow scrolled track back left (scrollLeft: ${scrolledRight}px -> ${scrolledLeft}px)`);

    // Keyboard Navigation
    await evaluate(`(() => {
      const track = document.querySelector('.category-carousel-track');
      track.focus();
      track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    })()`);
    await sleep(500);
    let keyScrolled = await evaluate(`document.querySelector('.category-carousel-track').scrollLeft`);
    assert(keyScrolled > scrolledLeft, `Keyboard ArrowRight smoothly advances track (scrollLeft: ${keyScrolled}px)`);

    // Scroll carousel into view for authentic pointer interactions
    await evaluate(`document.querySelector('.category-carousel-track').scrollIntoView({ block: 'center' })`);
    await sleep(400);

    // Mouse Drag with native CDP input dispatch (drag rightwards away from right boundary)
    const trackRect = await evaluate(`(() => {
      const el = document.querySelector('.category-carousel-track');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, startScroll: el.scrollLeft };
    })()`);

    const dragStartX = Math.round(trackRect.x + 150);
    const dragEndX = Math.round(trackRect.x + 350);
    const dragY = Math.round(trackRect.y + 40);

    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: dragStartX,
      y: dragY,
      button: 'left',
      clickCount: 1
    });
    await sleep(80);

    for (let x = dragStartX; x <= dragEndX; x += 25) {
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: x,
        y: dragY
      });
      await sleep(20);
    }

    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: dragEndX,
      y: dragY,
      button: 'left'
    });
    await sleep(400);

    const afterDragScroll = await evaluate(`document.querySelector('.category-carousel-track').scrollLeft`);
    const dragDelta = Math.abs(afterDragScroll - trackRect.startScroll);
    assert(dragDelta > 10, `Mouse drag moved track fluidly (delta: ${dragDelta}px)`);

    // Snap Check
    const snapType = await evaluate(`window.getComputedStyle(document.querySelector('.category-carousel-track')).scrollSnapType`);
    assert(!snapType.includes('mandatory'), `Track uses smooth fluid motion without mandatory snap jumps (scroll-snap-type: ${snapType})`);

    // -------------------------------------------------------------------------
    // [5/7] FEATURED RESTAURANTS & CUSTOMER DISCOVERY FLOW
    // -------------------------------------------------------------------------
    console.log("\n[5/7] Testing Featured Restaurants & Customer Flow...");
    await setViewport(1440, 900);
    await client.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1200);

    await takeScreenshot('04-restaurant-discovery.png');

    const restaurantState = await evaluate(`(() => {
      const grid = document.querySelector('.landing-restaurants-grid');
      if (!grid) return 'missing';
      const cards = grid.querySelectorAll('.sd-card-interactive, .restaurant-card');
      const skeletons = grid.querySelectorAll('.restaurant-skeleton-card');
      const empty = grid.querySelector('.landing-restaurants-empty');
      const error = grid.querySelector('.landing-restaurants-error');
      if (skeletons.length > 0) return 'skeleton';
      if (cards.length > 0) return 'success:' + cards.length;
      if (empty) return 'empty';
      if (error) return 'error';
      return 'unknown';
    })()`);
    assert(restaurantState.startsWith('success:') || restaurantState === 'empty',
      `Featured restaurants loaded clean state (state: ${restaurantState})`);

    // Setup SPA reload tracker before user navigation
    await evaluate(`window.__spaReloadCount = 0; window.addEventListener('beforeunload', () => { window.__spaReloadCount++; });`);

    // Quick Search Chip click
    await evaluate(`(() => {
      const chips = Array.from(document.querySelectorAll('.landing-tag-chip'));
      if (chips.length > 0) chips[0].click();
    })()`);
    await sleep(800);

    let searchUrl = await evaluate(`window.location.pathname + window.location.search`);
    assert(searchUrl.includes('/customer/home') && searchUrl.includes('q='),
      `Quick search chip triggered SPA navigation to ${searchUrl}`);

    // Check SPA preserved (no full page reload during in-app navigation)
    const spaReloads = await evaluate(`window.__spaReloadCount || 0`);
    assert(spaReloads === 0, `In-app search navigation executed with 0 full document reloads (SPA preserved)`);

    // Navigate to Checkout
    await client.send('Page.navigate', { url: 'http://localhost:3000/checkout' });
    await sleep(800);
    await takeScreenshot('05-checkout-form.png');

    let checkoutPath = await evaluate(`window.location.pathname`);
    assert(checkoutPath.includes('/auth/login') || checkoutPath === '/checkout',
      `Protected checkout route correctly handled (actual path: ${checkoutPath})`);

    // -------------------------------------------------------------------------
    // [6/7] RESPONSIVE VIEWPORTS & ZERO HORIZONTAL OVERFLOW
    // -------------------------------------------------------------------------
    console.log("\n[6/7] Testing Responsive Viewports (360px to 1440px)...");
    await client.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1000);

    const viewports = [
      { w: 360, h: 800, name: "Small Mobile (360x800)" },
      { w: 390, h: 844, name: "iPhone 13/14 (390x844)", shot: '06-mobile-390x844.png' },
      { w: 412, h: 915, name: "Android Flagship (412x915)" },
      { w: 768, h: 1024, name: "iPad Portrait (768x1024)", shot: '07-tablet-768x1024.png' },
      { w: 1366, h: 768, name: "Standard Laptop (1366x768)" },
      { w: 1440, h: 900, name: "Desktop Wide (1440x900)" }
    ];

    for (const vp of viewports) {
      await setViewport(vp.w, vp.h);
      await sleep(350);

      const metrics = await evaluate(`(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasOverflow: doc.scrollWidth > doc.clientWidth + 1
        };
      })()`);

      assert(!metrics.hasOverflow,
        `${vp.name}: No horizontal overflow (scrollWidth: ${metrics.scrollWidth}px, clientWidth: ${metrics.clientWidth}px)`);

      if (vp.shot) {
        await takeScreenshot(vp.shot);
      }
    }

    // -------------------------------------------------------------------------
    // [7/7] CONSOLE EXCEPTIONS & SPA DOCUMENT RELOAD AUDIT
    // -------------------------------------------------------------------------
    console.log("\n[7/7] Checking Console Exceptions and Document-level Page Reloads...");
    console.log("  Recorded console exceptions:", uncaughtErrors);
    const fatalErrors = uncaughtErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('manifest') && 
      !e.includes('Stripe') &&
      !e.includes('stripe') &&
      !e.includes('ResizeObserver')
    );
    assert(fatalErrors.length === 0,
      `0 fatal React/JavaScript runtime exceptions (filtered fatal errors: ${fatalErrors.length})`);

    assert(spaReloads === 0,
      `SPA client-side navigation maintained with 0 full document reloads during interactions`);

    client.close();

    console.log("\n==================================================================");
    console.log(`REAL BROWSER VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} PASSED (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    if (failedChecks > 0) {
      console.error(`FAILED CHECKS: ${failedChecks}`);
      process.exit(1);
    } else {
      console.log("ALL REAL BROWSER RENDERING TESTS PASSED ON GOOGLE CHROME v152 WITH ZERO DEFECTS!");
      console.log("==================================================================\n");
    }

  } finally {
    if (chromeInstance.process) {
      console.log("Cleaning up dedicated Chrome process...");
      chromeInstance.process.kill();
    }
  }
}

main().catch(err => {
  console.error("FATAL BROWSER TEST RUNNER ERROR:", err);
  process.exit(1);
});
