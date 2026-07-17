import { expect, test } from '@playwright/test'

test('participant submission updates dashboard and seeds the next experiment', async ({ context }) => {
  const chooseSix = (page: import('@playwright/test').Page) =>
    page.locator('.rating-scale label').filter({ hasText: /^6$/ }).click()
  const dashboard = await context.newPage()
  await dashboard.goto('/dashboard')
  await dashboard.getByLabel('Admin PIN').fill('sebsans')
  await dashboard.getByRole('button', { name: 'Open dashboard' }).click()
  await expect(dashboard.getByRole('heading', { name: 'Seb Sans dashboard' })).toBeVisible()
  const completedMetric = dashboard.locator('.metric').filter({ hasText: 'Completed' }).locator('strong')
  const before = Number(await completedMetric.textContent())

  const participant = await context.newPage()
  await participant.goto('/survey')
  await participant.getByRole('button', { name: /Start the test/ }).click()
  await expect(participant.getByRole('heading', { name: 'Make the headline feel clear.' })).toBeVisible()
  await chooseSix(participant)
  await participant.getByRole('button', { name: /Continue/ }).click()

  await expect(participant.getByRole('heading', { name: 'Settle into a reading rhythm.' })).toBeVisible()
  await chooseSix(participant)
  await participant.getByRole('button', { name: /Continue/ }).click()

  await participant.getByLabel('What works well?').fill('The figures and lowercase forms stay distinct.')
  await participant.getByLabel('What would you change?').fill('I would test slightly tighter display tracking.')
  await chooseSix(participant)
  await participant.getByRole('button', { name: /Continue/ }).click()

  await participant.getByPlaceholder('Seb Sans feels…').fill('Warm, deliberate, and easy to scan.')
  await participant.getByRole('button', { name: /Submit feedback/ }).click()
  await expect(participant.getByText(/SEB-[A-F0-9]{6}/)).toBeVisible()

  await expect(completedMetric).toHaveText(String(before + 1), { timeout: 10_000 })
  await dashboard.getByRole('button', { name: 'Create next test from medians' }).click()
  await expect(dashboard.getByText(/created as a draft/)).toBeVisible()
  const draft = dashboard.locator('.experiment-list article').filter({ hasText: 'draft' }).first()
  await draft.getByRole('button', { name: 'Activate for new sessions' }).click()
  await expect(dashboard.getByText(/active for future participants/)).toBeVisible()
})
