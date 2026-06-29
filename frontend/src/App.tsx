import { FileDown, History, Languages, Link2, Printer, Repeat, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { languages } from './i18n'
import {
  Currency,
  LineItem,
  calculateTotals,
  currencies,
  defaultDraft,
  formatMoney,
  previewInvoice
} from './lib/invoice'

const deviceId = `invoice-generator-${Math.random().toString(36).slice(2)}`

function App() {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState(defaultDraft())
  const [status, setStatus] = useState('')
  const totals = useMemo(() => calculateTotals(draft), [draft])
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').replace('@posix', '')
  const path = window.location.pathname

  if (path === '/pricing') return <PricingPage />
  if (path === '/privacy') return <PolicyPage type="privacy" />
  if (path === '/terms') return <PolicyPage type="terms" />
  if (path.startsWith('/p/')) return <SeoPage path={path} />

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item)
    }))
  }

  const addItem = () => {
    setDraft((current) => ({
      ...current,
      items: [...current.items, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]
    }))
  }

  const removeItem = (id: string) => {
    setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
  }

  const validateAndPrint = async () => {
    try {
      setStatus(t('working'))
      await previewInvoice(draft, deviceId)
      setStatus(t('ready'))
      window.print()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('error'))
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/">DenseMatrix Ledger</a>
        <nav>
          <a href="/p/free-invoice-generator-for-freelancers-with-tax/">{t('seo')}</a>
          <a href="/pricing">{t('pricing')}</a>
          <select aria-label="Language" value={i18n.language} onChange={(event) => i18n.changeLanguage(event.target.value)}>
            {languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('headline')}</h1>
          <p>{t('subhead')}</p>
        </div>
        <div className="mode-switch" aria-label="Document mode">
          <button className={draft.mode === 'invoice' ? 'active' : ''} onClick={() => setDraft({ ...draft, mode: 'invoice' })}>{t('invoice')}</button>
          <button className={draft.mode === 'estimate' ? 'active' : ''} onClick={() => setDraft({ ...draft, mode: 'estimate' })}>{t('estimate')}</button>
        </div>
      </section>

      <section className="workspace">
        <form className="editor" data-testid="invoice-form">
          <div className="field-grid">
            <label>{t('sender')}<textarea value={draft.sender} onChange={(event) => setDraft({ ...draft, sender: event.target.value })} /></label>
            <label>{t('client')}<textarea value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} /></label>
            <label>{t('number')}<input value={draft.invoiceNumber} onChange={(event) => setDraft({ ...draft, invoiceNumber: event.target.value })} /></label>
            <label>{t('currency')}<select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as Currency })}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
            <label>{t('issueDate')}<input type="date" value={draft.issueDate} onChange={(event) => setDraft({ ...draft, issueDate: event.target.value })} /></label>
            <label>{t('dueDate')}<input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
          </div>

          <div className="items">
            <div className="item-head">
              <span>{t('description')}</span><span>{t('qty')}</span><span>{t('price')}</span><span />
            </div>
            {draft.items.map((item) => (
              <div className="item-row" key={item.id}>
                <input data-testid="line-description" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} />
                <input type="number" min="0" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} />
                <input type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} />
                <button type="button" aria-label="Remove line item" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" className="ghost" onClick={addItem}>{t('addItem')}</button>
          </div>

          <div className="field-grid compact">
            <label>{t('tax')}<input type="number" min="0" max="100" value={draft.taxRate} onChange={(event) => setDraft({ ...draft, taxRate: Number(event.target.value) })} /></label>
            <label>{t('discount')}<input type="number" min="0" max="100" value={draft.discountRate} onChange={(event) => setDraft({ ...draft, discountRate: Number(event.target.value) })} /></label>
          </div>
          <label>{t('notes')}<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <div className="actions">
            <button type="button" data-testid="print-button" onClick={validateAndPrint}><Printer size={18} />{t('print')}</button>
            <a className="button secondary" href="/pricing"><Sparkles size={18} />{t('upgrade')}</a>
          </div>
          <p data-testid="status" className="status">{status}</p>
        </form>

        <article className="preview" data-testid="preview">
          <div className="paper">
            <div className="paper-head">
              <h2>{draft.mode === 'invoice' ? t('invoice') : t('estimate')}</h2>
              <strong>{draft.invoiceNumber}</strong>
            </div>
            <div className="addresses">
              <pre>{draft.sender}</pre>
              <pre>{draft.client}</pre>
            </div>
            <table>
              <thead><tr><th>{t('description')}</th><th>{t('qty')}</th><th>{t('price')}</th><th>{t('amount')}</th></tr></thead>
              <tbody>
                {draft.items.map((item) => <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice, draft.currency, locale)}</td><td>{formatMoney(item.quantity * item.unitPrice, draft.currency, locale)}</td></tr>)}
              </tbody>
            </table>
            <dl className="totals">
              <dt>{t('subtotal')}</dt><dd>{formatMoney(totals.subtotal, draft.currency, locale)}</dd>
              <dt>{t('discount')}</dt><dd>{formatMoney(totals.discount, draft.currency, locale)}</dd>
              <dt>{t('tax')}</dt><dd>{formatMoney(totals.tax, draft.currency, locale)}</dd>
              <dt>{t('total')}</dt><dd>{formatMoney(totals.total, draft.currency, locale)}</dd>
            </dl>
            <p>{draft.notes}</p>
          </div>
        </article>
      </section>

      <section className="paid-hooks">
        {[['templates', ShieldCheck], ['recurring', Repeat], ['links', Link2], ['history', History], ['language', Languages], ['pdf', FileDown]].map(([key, Icon]) => (
          <div className="hook" key={key as string}><Icon size={20} /><span>{t(key as string)}</span></div>
        ))}
      </section>
    </main>
  )
}

function PricingPage() {
  const { t } = useTranslation()
  const tiers = [
    ['Free', '$0', t('freePlan')],
    ['Starter', '$5/mo', t('starterPlan')],
    ['Studio', '$12/mo', t('studioPlan')],
    ['Business', '$29/mo', t('businessPlan')]
  ]
  return <main><header className="topbar"><a className="brand" href="/">DenseMatrix Ledger</a><a href="/">{t('back')}</a></header><section className="pricing">{tiers.map((tier) => <article key={tier[0]}><h2>{tier[0]}</h2><strong>{tier[1]}</strong><p>{tier[2]}</p><button>{t('choose')}</button></article>)}</section></main>
}

function PolicyPage({ type }: { type: 'privacy' | 'terms' }) {
  return <main><header className="topbar"><a className="brand" href="/">DenseMatrix Ledger</a></header><section className="policy"><h1>{type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h1><p>This invoice generator stores drafts in your browser for the free workflow. Paid account features may store templates, client history, and subscription metadata. This product creates business documents and does not provide tax, accounting, legal, or compliance advice.</p><p>Support: support@densematrix.ai</p></section></main>
}

function SeoPage({ path }: { path: string }) {
  const title = path.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'invoice generator'
  return <main><header className="topbar"><a className="brand" href="/">DenseMatrix Ledger</a><a href="/">Open generator</a></header><section className="seo-page"><h1>{title}</h1><p>Create polished invoices and estimates with tax, discounts, payment terms, and PDF export. This Invoice Generator alternative is built for fast one-off documents and upgrade-ready workflows.</p><a className="button" href="/">Use the free generator</a></section></main>
}

export default App
