// Native fetch used in Node 24

async function testFrontend() {
  console.log('Testing Frontend on http://localhost:3000...');
  const res = await fetch('http://localhost:3000');
  console.log('Homepage status:', res.status);
  const html = await res.text();
  console.log('HTML size:', html.length, 'bytes');

  const jsMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  const cssMatches = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);

  console.log('JS resources found:', jsMatches);
  console.log('CSS resources found:', cssMatches);

  for (const js of jsMatches) {
    const jsUrl = js.startsWith('http') ? js : `http://localhost:3000${js}`;
    const r = await fetch(jsUrl);
    const text = await r.text();
    console.log(`JS ${js} => HTTP ${r.status} (${text.length} bytes)`);
    if (r.status !== 200 || text.length === 0) {
      throw new Error(`Failed to load JS: ${js}`);
    }
  }

  for (const css of cssMatches) {
    const cssUrl = css.startsWith('http') ? css : `http://localhost:3000${css}`;
    const r = await fetch(cssUrl);
    const text = await r.text();
    console.log(`CSS ${css} => HTTP ${r.status} (${text.length} bytes)`);
    if (r.status !== 200 || text.length === 0) {
      throw new Error(`Failed to load CSS: ${css}`);
    }
  }

  console.log('✅ Frontend static bundle verified successfully!');
}

testFrontend().catch(err => {
  console.error('❌ Frontend test failed:', err);
  process.exit(1);
});
