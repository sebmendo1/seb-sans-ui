import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('welcome and dashboard have no serious accessibility violations', async ({ page }) => {
  await page.goto('/survey')
  const surveyResults = await new AxeBuilder({ page }).analyze()
  expect(
    surveyResults.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])

  await page.goto('/dashboard')
  await page.getByLabel('Admin PIN').fill('sebsans')
  await page.getByRole('button', { name: 'Open dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Seb Sans dashboard' })).toBeVisible()
  const dashboardResults = await new AxeBuilder({ page }).analyze()
  expect(
    dashboardResults.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
})
