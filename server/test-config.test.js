const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { validateTestServer, applyTestServer } = require('../lib/test-server.cjs');

test('staging fails closed without a separate valid server', () => {
  assert.throws(() => validateTestServer('', true));
  for (const url of ['https://base-boing-battle-1.onrender.com', 'https://base-boing-battle-usa.onrender.com', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/path']) {
    assert.throws(() => validateTestServer(url));
  }
  assert.equal(validateTestServer('https://test.example.com/'), 'https://test.example.com');
});

for (const route of ['mobile', 'store']) {
  test(route + ' embedded scripts remain valid and test endpoints replace production', () => {
    const file = require('node:path').join(__dirname, '../app', route, 'page.tsx');
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let html;
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(ast) === '__html') html = node.initializer.arguments[0].text;
      ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.ok(html);
    assert.equal(applyTestServer(html, undefined), html);
    const isolated = applyTestServer(html, 'https://test.example.com');
    assert.ok(!isolated.includes('base-boing-battle-1.onrender.com'));
    assert.ok(!isolated.includes('base-boing-battle-usa.onrender.com'));
    assert.ok(isolated.includes('var SOCKET_EU="https://test.example.com";'));
    assert.ok(isolated.includes('var SOCKET_US="https://test.example.com";'));
    for (const match of isolated.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      if (match[1].trim()) new vm.Script(match[1]);
    }
  });
}
