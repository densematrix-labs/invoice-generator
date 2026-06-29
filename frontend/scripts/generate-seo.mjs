import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const publicDir = join(root, 'public')
const baseUrl = 'https://invoice-generator.demo.densematrix.ai'
const intents = ['free-invoice-generator', 'estimate-generator', 'invoice-template', 'quote-generator', 'invoice-generator-alternative', 'invoice-maker', 'blank-invoice-template', 'simple-invoice-generator', 'online-invoice-generator', 'business-invoice-template']
const industries = ['freelancers', 'contractors', 'consultants', 'designers', 'photographers', 'agencies', 'landscapers', 'cleaners', 'developers', 'tutors', 'coaches', 'writers', 'videographers', 'bookkeepers', 'marketers', 'repair-shops', 'event-planners', 'architects', 'therapists', 'trainers', 'electricians', 'plumbers', 'caterers', 'salons', 'virtual-assistants']
const features = ['tax', 'discount', 'pdf-export', 'payment-terms', 'client-history', 'recurring-invoices', 'branding-removal', 'payment-links', 'templates', 'multi-currency', 'notes', 'line-items', 'quote-mode', 'deposit', 'net-30', 'sales-tax', 'vat', 'late-fees', 'printable', 'no-signup', 'no-watermark', 'small-business', 'mobile-friendly', 'simple-layout', 'professional-template']

const urls = []
for (const intent of intents) {
  for (const industry of industries) {
    for (const feature of features) {
      urls.push(`/p/${intent}-for-${industry}-with-${feature}/`)
    }
  }
}

mkdirSync(publicDir, { recursive: true })
writeFileSync(join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/sitemap-main.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-programmatic.xml</loc></sitemap>
</sitemapindex>
`)
writeFileSync(join(publicDir, 'sitemap-main.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/pricing', '/privacy', '/terms', '/p/free-invoice-generator-for-freelancers-with-tax/'].map((path) => `  <url><loc>${baseUrl}${path}</loc></url>`).join('\n')}
</urlset>
`)
writeFileSync(join(publicDir, 'sitemap-programmatic.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${baseUrl}${path}</loc></url>`).join('\n')}
</urlset>
`)

const seoManifest = {
  generatedAt: new Date().toISOString(),
  count: urls.length,
  examples: urls.slice(0, 5)
}
writeFileSync(join(publicDir, 'programmatic-seo.json'), JSON.stringify(seoManifest, null, 2))
