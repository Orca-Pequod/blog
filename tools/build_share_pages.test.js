const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MAX_ARTICLE_ID_LENGTH,
  validateArticleIds,
  resolveArticleOutputFile
} = require('./build_share_pages.js');

test('accepts unique lowercase slug article IDs', () => {
  assert.doesNotThrow(() => validateArticleIds([
    { id: 'labor-law-2026' },
    { id: 'ai-compliance-1' }
  ]));
});

test('rejects unsafe or malformed article IDs', () => {
  const invalidIds = [
    '../outside',
    'nested/path',
    'Uppercase',
    'has space',
    'double--dash',
    '-leading',
    'trailing-',
    "quote'break",
    'a'.repeat(MAX_ARTICLE_ID_LENGTH + 1)
  ];

  invalidIds.forEach(id => {
    assert.throws(() => validateArticleIds([{ id }]), /非法文章 ID/);
  });

  assert.throws(() => validateArticleIds([{ id: null }]), /必须是字符串/);
});

test('rejects duplicate article IDs', () => {
  assert.throws(
    () => validateArticleIds([{ id: 'same-id' }, { id: 'same-id' }]),
    /重复文章 ID/
  );
});

test('keeps resolved output files directly inside the articles directory', () => {
  const safeFile = resolveArticleOutputFile('safe-id');
  assert.equal(path.basename(safeFile), 'safe-id.html');
  assert.throws(() => resolveArticleOutputFile('../outside'), /输出路径越界/);
  assert.throws(() => resolveArticleOutputFile('nested/path'), /输出路径越界/);
});
