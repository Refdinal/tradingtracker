import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
assert.equal(manifest.name, 'Stack — BTC Trading Journal')
assert.equal(manifest.display, 'standalone')
assert.equal(manifest.start_url, '/')

for (const size of [192, 512]) {
  const iconPath = new URL(`../public/icons/icon-${size}.png`, import.meta.url)
  const icon = await readFile(iconPath)
  assert.deepEqual(icon.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  assert.ok((await stat(iconPath)).size > 100, `icon-${size}.png should not be empty`)
}

const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
assert.match(serviceWorker, /self\.addEventListener\('fetch'/)
assert.match(serviceWorker, /url\.pathname\.startsWith\('\/api\/'\)/)
console.log('PWA manifest, icons, and service worker checks passed.')
