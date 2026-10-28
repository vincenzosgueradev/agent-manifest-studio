/** Tiny DOM helpers shared by the views. Text always goes through `textContent`, never `innerHTML`. */

type Attrs = Record<string, string | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Attrs = {},
    ...children: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === false) continue;
        if (k === 'class') node.className = String(v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
    }
    for (const c of children) {
        if (c === null || c === undefined) continue;
        node.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
}

export function clear(node: Element): void {
    while (node.firstChild) node.removeChild(node.firstChild);
}

/** A value cell that truncates with an ellipsis and keeps the full text in `title`. */
export function truncating(tag: 'dd' | 'span' | 'div', text: string, cls = ''): HTMLElement {
    return el(tag, { class: cls, title: text }, text);
}
