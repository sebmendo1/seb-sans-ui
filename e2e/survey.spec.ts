import { expect, test } from '@playwright/test'

test('participant can complete the static survey and dashboard loads browser submissions', async ({ context }) => {
  const chooseSix = (page: import('@playwright/test').Page) =>
    page.locator('.rating-scale label').filter({ hasText: /^6$/ }).click()

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

  const dashboard = await context.newPage()
  await dashboard.goto('/dashboard')
  await dashboard.getByLabel('Admin PIN').fill('sebsans')
  await dashboard.getByRole('button', { name: 'Open dashboard' }).click()
  await expect(dashboard.getByRole('heading', { name: 'Seb Sans dashboard' })).toBeVisible()
  await dashboard.getByRole('button', { name: 'Load this browser' }).click()
  await expect(dashboard.locator('.metric').filter({ hasText: 'Completed' }).locator('strong')).toHaveText('1')
})
