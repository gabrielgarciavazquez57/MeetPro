import { traducir } from './traducciones';

const ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt'];
const SALTAR = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE']);

interface Par {
  es: string;
  en: string;
}

/**
 * Traduce lo que se ve en pantalla (textos, placeholders, títulos) usando el diccionario.
 * Sigue los cambios de la página con un MutationObserver y puede volver al español sin recargar.
 */
export class TraductorDom {
  private readonly textos = new WeakMap<Text, Par>();
  private readonly atributos = new WeakMap<Element, Map<string, Par>>();
  private observador: MutationObserver | null = null;

  activar(): void {
    if (this.observador) {
      return;
    }
    this.recorrer(document.documentElement, (nodo) => this.traducirNodo(nodo));
    this.observador = new MutationObserver((mutaciones) => {
      for (const m of mutaciones) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => this.recorrer(n, (nodo) => this.traducirNodo(nodo)));
        } else if (m.type === 'characterData') {
          this.traducirNodo(m.target);
        } else if (m.type === 'attributes' && m.attributeName) {
          this.traducirAtributo(m.target as Element, m.attributeName);
        }
      }
    });
    this.observador.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATRIBUTOS,
    });
  }

  desactivar(): void {
    if (!this.observador) {
      return;
    }
    this.observador.disconnect();
    this.observador = null;
    this.recorrer(document.documentElement, (nodo) => this.restaurarNodo(nodo));
  }

  /** Aplica una función a cada nodo de texto y a cada elemento bajo la raíz (sin entrar a scripts, estilos, etc.) */
  private recorrer(raiz: Node, accion: (nodo: Node) => void): void {
    if (raiz.nodeType === Node.TEXT_NODE) {
      accion(raiz);
      return;
    }
    if (raiz.nodeType !== Node.ELEMENT_NODE || this.omitido(raiz as Element)) {
      return;
    }
    accion(raiz);
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.nodeType === Node.ELEMENT_NODE && this.omitido(n as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let actual = caminante.nextNode();
    while (actual) {
      accion(actual);
      actual = caminante.nextNode();
    }
  }

  private omitido(el: Element): boolean {
    return SALTAR.has(el.tagName) || el.getAttribute('translate') === 'no';
  }

  private traducirNodo(nodo: Node): void {
    if (nodo.nodeType === Node.TEXT_NODE) {
      this.traducirTexto(nodo as Text);
    } else if (nodo.nodeType === Node.ELEMENT_NODE) {
      for (const nombre of ATRIBUTOS) {
        this.traducirAtributo(nodo as Element, nombre);
      }
    }
  }

  private traducirTexto(nodo: Text): void {
    const valor = nodo.nodeValue ?? '';
    const par = this.textos.get(nodo);
    if (par && valor === par.en) {
      return;
    }
    const en = traducir(valor);
    if (en === null) {
      return;
    }
    const inicio = /^\s*/.exec(valor)?.[0] ?? '';
    const fin = /\s*$/.exec(valor)?.[0] ?? '';
    const nuevo = inicio + en + fin;
    this.textos.set(nodo, { es: valor, en: nuevo });
    nodo.nodeValue = nuevo;
  }

  private traducirAtributo(el: Element, nombre: string): void {
    const valor = el.getAttribute(nombre);
    if (valor === null) {
      return;
    }
    const pares = this.atributos.get(el);
    const par = pares?.get(nombre);
    if (par && valor === par.en) {
      return;
    }
    const en = traducir(valor);
    if (en === null) {
      return;
    }
    const mapa = pares ?? new Map<string, Par>();
    mapa.set(nombre, { es: valor, en });
    this.atributos.set(el, mapa);
    el.setAttribute(nombre, en);
  }

  private restaurarNodo(nodo: Node): void {
    if (nodo.nodeType === Node.TEXT_NODE) {
      const par = this.textos.get(nodo as Text);
      if (par && nodo.nodeValue === par.en) {
        nodo.nodeValue = par.es;
      }
    } else if (nodo.nodeType === Node.ELEMENT_NODE) {
      const el = nodo as Element;
      const pares = this.atributos.get(el);
      pares?.forEach((par, nombre) => {
        if (el.getAttribute(nombre) === par.en) {
          el.setAttribute(nombre, par.es);
        }
      });
    }
  }
}
