/** עוזרי DOM קטנים, כדי לבנות מסכים בלי מחרוזות HTML ובלי ספריות. */

type Props = {
  class?: string
  text?: string
  html?: string
  type?: string
  title?: string
  ariaLabel?: string
  /** מסתיר מקוראי מסך. לעיטורים שהמידע שבהם כבר נאמר בטקסט. */
  ariaHidden?: boolean
  role?: string
  /** כיוון הכתיבה. משמש לטקסט באנגלית בתוך דף בעברית. */
  dir?: 'ltr' | 'rtl'
  tabIndex?: number
  dataset?: Record<string, string>
  style?: Partial<CSSStyleDeclaration>
  onClick?: (e: MouseEvent) => void
  onKeyDown?: (e: KeyboardEvent) => void
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: (Node | string | null | undefined)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props.class) node.className = props.class
  if (props.text !== undefined) node.textContent = props.text
  if (props.html !== undefined) node.innerHTML = props.html
  if (props.title) node.title = props.title
  if (props.ariaLabel) node.setAttribute('aria-label', props.ariaLabel)
  if (props.ariaHidden) node.setAttribute('aria-hidden', 'true')
  if (props.role) node.setAttribute('role', props.role)
  if (props.dir) node.dir = props.dir
  if (props.tabIndex !== undefined) node.tabIndex = props.tabIndex
  if (props.type && node instanceof HTMLButtonElement) node.type = props.type as 'button' | 'submit' | 'reset'
  if (props.dataset) for (const [k, v] of Object.entries(props.dataset)) node.dataset[k] = v
  if (props.style) Object.assign(node.style, props.style)
  if (props.onClick) node.addEventListener('click', props.onClick as EventListener)
  if (props.onKeyDown) node.addEventListener('keydown', props.onKeyDown as EventListener)
  for (const c of children) {
    if (c === null || c === undefined) continue
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return node
}

/** כפתור גדול וברור. כל הכפתורים במשחק עוברים דרך כאן. */
export function bigButton(label: string, onClick: () => void, opts: { emoji?: string; variant?: string; ariaLabel?: string } = {}): HTMLButtonElement {
  const btn = el('button', {
    class: `big-btn ${opts.variant ?? ''}`.trim(),
    type: 'button',
    ariaLabel: opts.ariaLabel ?? label,
    onClick,
  })
  if (opts.emoji) btn.appendChild(el('span', { class: 'big-btn-emoji', text: opts.emoji }))
  btn.appendChild(el('span', { class: 'big-btn-label', text: label }))
  return btn
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild)
}

/** מנקה מאזין אחרי שמסך נסגר. */
export function on<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, handler as EventListener, options)
  return () => target.removeEventListener(type, handler as EventListener, options)
}
