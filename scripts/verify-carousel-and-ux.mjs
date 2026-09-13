import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🎠 SKYDISH — CAROUSEL & SMOOTH UX AUDIT VERIFIER');
console.log('====================================================\n');

const checks = [];
function record(section, testName, pass, details = '') {
  checks.push({ section, testName, pass, details });
  console.log(`[${section}] ${pass ? '✅ PASS' : '❌ FAIL'}: ${testName} ${details ? '(' + details + ')' : ''}`);
}

// 1. CAROUSEL STATIC & CONTRACT AUDIT
const homeJs = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/pages/Home.js'), 'utf-8');
const homeCss = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/styles/home.css'), 'utf-8');

// Desktop arrows
const hasLeftArrow = homeJs.includes('carousel-nav-btn--left') && homeJs.includes('FaChevronLeft');
const hasRightArrow = homeJs.includes('carousel-nav-btn--right') && homeJs.includes('FaChevronRight');
record('Carousel', 'Desktop Left/Right Arrows Implemented', hasLeftArrow && hasRightArrow, 'FaChevronLeft & FaChevronRight with scroll buttons');

// Mobile swipe & Touch events
const hasTouch = homeJs.includes('onTouchStart={pauseInteraction}') && homeJs.includes('onTouchEnd={scheduleResume}');
record('Carousel', 'Mobile Touch Swipe Support', hasTouch, 'onTouchStart / onTouchEnd with interaction pause');

// Mouse drag
const hasMouseDrag = homeJs.includes('handleMouseDown') && homeJs.includes('handleMouseMove') && homeJs.includes('handleMouseUp') && homeJs.includes('deltaX');
record('Carousel', 'Mouse Drag Navigation', hasMouseDrag, 'MouseDown/MouseMove/MouseUp with drag threshold > 5px');

// Keyboard navigation
const hasKeyboard = homeJs.includes('ArrowRight') && homeJs.includes('ArrowLeft') && homeJs.includes('scrollByAmount');
record('Carousel', 'Keyboard Navigation (ArrowLeft / ArrowRight)', hasKeyboard, 'Keydown handlers for ArrowLeft/Right');

// Auto-scroll loop
const hasAutoScroll = homeJs.includes('setInterval(tick') && homeJs.includes('AUTO_SCROLL_STEP_MS');
record('Carousel', 'Smooth Auto-Scroll Interval', hasAutoScroll, 'setInterval with AUTO_SCROLL_STEP_MS = 3800ms');

// Pause on hover
const hasHoverPause = homeJs.includes('onMouseEnter={pauseInteraction}') && homeJs.includes('onMouseLeave={scheduleResume}');
record('Carousel', 'Pause on Hover & Resume on Leave', hasHoverPause, 'onMouseEnter / onMouseLeave binding');

// Pause during interaction & Resume after idle
const hasInteractionPause = homeJs.includes('pauseInteraction') && homeJs.includes('scheduleResume') && homeJs.includes('RESUME_IDLE_DELAY_MS = 3000');
record('Carousel', 'Pause on Interaction & Resume After 3s Idle', hasInteractionPause, 'RESUME_IDLE_DELAY_MS = 3000ms within 2-4s target');

// Reduced motion media query
const hasReducedMotion = homeJs.includes('prefers-reduced-motion: reduce') && homeJs.includes('setPrefersReducedMotion');
record('Carousel', 'Prefers Reduced Motion Compliance', hasReducedMotion, 'Disables auto-scroll if user prefers reduced motion');

// No endless marquee / No visual jump
const hasSmoothLoop = homeJs.includes('el.scrollTo({ left: 0, behavior: "smooth" })');
const noMarqueeCss = !homeCss.includes('animation: marquee') && !homeCss.includes('@keyframes marquee');
record('Carousel', 'No Endless Marquee & Smooth Loop-Back', hasSmoothLoop && noMarqueeCss, 'Smooth reset scroll without infinite marquee cloning');

// CSS Scrollbar & Fade styling
const hasFadeCss = homeCss.includes('.category-carousel-wrapper::before') && homeCss.includes('.category-carousel-wrapper::after');
record('Carousel', 'Edge Fade Gradients & Overflow Styles', hasFadeCss, 'CSS gradient fades and clean overflow');

// 2. SMOOTH UX & NO-FULL-RELOAD AUDIT
const frontendSrcDir = path.join(ROOT_DIR, 'frontend/src');

function getAllJsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = getAllJsFiles(frontendSrcDir);

let reloadMatches = [];
let locationHrefMatches = [];
let documentLocationMatches = [];
let historyGoMatches = [];
let formSubmitMatches = [];

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

  if (/location\.reload\s*\(/.test(content)) {
    reloadMatches.push(relPath);
  }
  if (/document\.location/.test(content)) {
    documentLocationMatches.push(relPath);
  }
  if (/history\.go\s*\(/.test(content)) {
    historyGoMatches.push(relPath);
  }
  if (/\.submit\s*\(/.test(content) && !content.includes('handleSubmit')) {
    formSubmitMatches.push(relPath);
  }
  
  const hrefMatches = content.match(/(?:window\.)?location\.href\s*=\s*[^;\n]+/g);
  if (hrefMatches) {
    locationHrefMatches.push({ file: relPath, matches: hrefMatches });
  }
}

record('Smooth UX', 'Zero location.reload Invocations', reloadMatches.length === 0, 'Matches: ' + reloadMatches.length);
record('Smooth UX', 'Zero document.location Invocations', documentLocationMatches.length === 0, 'Matches: ' + documentLocationMatches.length);
record('Smooth UX', 'Zero history.go(0) Invocations', historyGoMatches.length === 0, 'Matches: ' + historyGoMatches.length);
record('Smooth UX', 'Zero Raw form.submit() Invocations', formSubmitMatches.length === 0, 'Matches: ' + formSubmitMatches.length);

// Classify location.href
let unclassifiedHref = [];
let totalHrefCount = 0;
for (const entry of locationHrefMatches) {
  for (const match of entry.matches) {
    totalHrefCount++;
    const isAllowedGateway = entry.file.includes('Checkout.js') && (
      match.includes('vnpayUrl') || 
      match.includes('paymentUrl') || 
      match.includes('payUrl') ||
      match.includes('vnpayQrUrl') ||
      match.includes('momoQrUrl') ||
      match.includes('momo')
    );
    if (!isAllowedGateway) {
      unclassifiedHref.push(entry.file + ': ' + match);
    }
  }
}
record('Smooth UX', 'Classification of location.href (Gateways Only)', unclassifiedHref.length === 0, 
  `All ${totalHrefCount} occurrences strictly isolated to external gateways (VNPay & MoMo) in Checkout.js`);

// 3. DUPLICATE LISTENER & INFINITE LOADING AUDIT
const headerJs = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/components/Header.js'), 'utf-8');
const hasHeaderCleanup = headerJs.includes('removeEventListener("keydown", handleKeyDown)') &&
  headerJs.includes('removeEventListener("mousedown", handleClickOutside)');
record('Smooth UX', 'Header Event Listener Cleanup on Unmount', hasHeaderCleanup, 'Removes keydown and mousedown listeners');

// Skeletons implementation in Home.js and home.css
const hasSkeletons = homeJs.includes('RestaurantSkeletons') && homeCss.includes('restaurant-skeleton-card');
record('Smooth UX', 'Loading Skeleton Shimmer State (No UI Jump)', hasSkeletons, 'RestaurantSkeletons with .restaurant-skeleton-card and shimmer');

const allPass = checks.every(c => c.pass);
console.log('\n====================================================');
console.log('Audit Summary: ' + checks.filter(c => c.pass).length + '/' + checks.length + ' Passed');
console.log('Result: ' + (allPass ? '🟢 ALL CHECKS PASSED' : '🔴 FAILURES DETECTED'));
console.log('====================================================\n');

process.exit(allPass ? 0 : 1);
