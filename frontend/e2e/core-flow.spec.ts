import { expect, test } from '@playwright/test'

test('core invoice flow renders, edits, prints, and exposes pricing', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Free Invoice Generator/)
  await page.getByTestId('line-description').first().fill('Consulting sprint')
  await page.getByRole('button', { name: /Print|PDF|打印|印刷|Drucken|Imprimer|인쇄|Imprimir/i }).click()
  await expect(page.getByTestId('status')).toContainText(/Ready|print|可以|準備|Bereit|Prêt|완료|Listo/i)
  await page.goto('/pricing')
  await expect(page.getByText('Starter')).toBeVisible()
})

test('language switch changes interface text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Language').selectOption('zh')
  await expect(page.getByText('无需注册，直接生成发票和报价单。')).toBeVisible()
})
