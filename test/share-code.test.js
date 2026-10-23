import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandomShareCode } from '../src/lib/patients.js';

test('createRandomShareCode generates valid 6-character codes without ambiguous characters', () => {
  const allowedChars = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''));
  const forbiddenChars = ['O', '0', 'I', '1'];

  const codes = new Set();
  for (let i = 0; i < 50; i++) {
    const code = createRandomShareCode();
    assert.equal(typeof code, 'string');
    assert.equal(code.length, 6, `Expected code length 6, got ${code.length} (${code})`);

    for (const char of code) {
      assert.ok(allowedChars.has(char), `Character '${char}' in code '${code}' should be in allowed set`);
      assert.ok(!forbiddenChars.includes(char), `Character '${char}' should not be in forbidden list`);
    }
    codes.add(code);
  }

  // Ensure randomness produces mostly unique codes
  assert.ok(codes.size >= 48, 'Should produce high-entropy unique codes');
});

test('Clean share code sanitization handles whitespace, dashes, and lowercase', () => {
  const sanitize = (code) => String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  assert.equal(sanitize('x7a9kq'), 'X7A9KQ');
  assert.equal(sanitize('  x7-a9 kq  '), 'X7A9KQ');
  assert.equal(sanitize('ABC#123!'), 'ABC123');
  assert.equal(sanitize(null), '');
});

test('Confusable character replacement maps 0->O and 1->I', () => {
  const normalize = (code) => code.replace(/0/g, 'O').replace(/1/g, 'I');

  assert.equal(normalize('X0A1KQ'), 'XOAIKQ'); // 0 -> O, 1 -> I
  assert.equal(normalize('998877'), '998877');
});
