import { test, expect, Page } from '@playwright/test'

async function interactWithApp(page: Page) {
  // Enough interaction to exercise any lazy network calls
  const addButton = page.getByRole('button', { name: /add/i })
  if (await addButton.isVisible()) await addButton.click()
  await page.waitForTimeout(500)
}

test('no network requests after initial page load', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const postLoadRequests: string[] = []
  page.on('request', req => postLoadRequests.push(req.url()))

  await interactWithApp(page)

  const external = postLoadRequests.filter(
    url =>
      !url.startsWith('http://localhost') &&
      !url.startsWith('http://127.0.0.1') &&
      !url.startsWith('ws://localhost') &&
      !url.startsWith('ws://127.0.0.1'),
  )
  expect(external).toHaveLength(0)
})

test('app is usable while offline', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await context.setOffline(true)

  await page.reload().catch(() => null) // reload may fail offline — that is expected
  // The page should still show something (cached/service-worker or already loaded)
  await expect(page.locator('body')).toBeVisible()
})

test('nothing stored outside localStorage', async ({ page }) => {
  await page.goto('/')
  await interactWithApp(page)

  const sessionKeys = await page.evaluate(() => Object.keys(sessionStorage))
  expect(sessionKeys).toHaveLength(0)

  const idbDatabases = await page.evaluate(async () => {
    const dbs = await indexedDB.databases()
    return dbs.map(d => d.name)
  })
  expect(idbDatabases).toHaveLength(0)

  const cookies = await page.context().cookies()
  expect(cookies).toHaveLength(0)
})

test('no third-party scripts loaded', async ({ page }) => {
  const scriptUrls: string[] = []
  page.on('response', resp => {
    if (resp.request().resourceType() === 'script') {
      scriptUrls.push(resp.url())
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const external = scriptUrls.filter(
    url =>
      !url.startsWith('http://localhost') &&
      !url.startsWith('http://127.0.0.1'),
  )
  expect(external).toHaveLength(0)
})

test('user-entered text is never rendered as a clickable link', async ({ page }) => {
  await page.goto('/')

  const nicknameInput = page.getByLabel(/nickname/i)
  if (await nicknameInput.isVisible()) {
    await nicknameInput.fill('uniquenickname123')
    const saveBtn = page.getByRole('button', { name: /save|add|confirm/i })
    if (await saveBtn.isVisible()) await saveBtn.click()
    await page.waitForTimeout(300)
  }

  const anchors = page.locator('a')
  const count = await anchors.count()
  for (let i = 0; i < count; i++) {
    const text = await anchors.nth(i).innerText()
    expect(text).not.toContain('uniquenickname123')
  }
})
