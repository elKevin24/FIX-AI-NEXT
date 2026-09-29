/* eslint-disable security/detect-non-literal-fs-filename -- este test audita
   todos los .css del proyecto, asi que recorre el arbol y construye rutas en
   runtime; no son entradas de usuario. */
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Audita que todo `var(--token)` referenciado en el CSS del proyecto este
 * definido en alguna parte del CSS.
 *
 * Motivo: cuando una custom property no existe y se usa sin fallback, la
 * declaracion pasa a ser "invalida en tiempo de calculo" y la propiedad cae
 * a su valor heredado. No hay error de sintaxis, `next build` compila, los
 * tests pasan, y el estilo simplemente no se ve. Asi es como `--color-border`
 * dejo sin dibujar los bordes de 4 modulos y `--color-background` dejo la
 * pagina offline sin fondo en modo oscuro.
 *
 * Nota: el proyecto compila con `target: es5` y sin `downlevelIteration`, por
 * eso se usa `exec` en bucle en vez de `for...of` sobre iteradores.
 */

/** Tokens que inyecta el tooling en runtime y por tanto no estan en el CSS. */
const RUNTIME_INJECTED = new Set([
  // next/font/google lo define en runtime como variable de clase; ver
  // src/app/layout.tsx (`variable: '--font-inter'` + `className={inter.variable}`).
  // Redeclararlo en :root anula el woff2 auto-hospedado y su preload.
  '--font-inter',
])

const SRC = join(__dirname, '..', '..', 'src')
const GLOBALS = join(SRC, 'app', 'globals.css')

function collectCssFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectCssFiles(full))
    else if (entry.name.endsWith('.css')) out.push(full)
  }
  return out
}

/** Quita comentarios y url() para no analizar su contenido como si fuera CSS. */
function stripNonCss(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, 'url()')
}

/** Invoca `onMatch` por cada coincidencia. Usa `exec` en bucle en vez de
 *  `for...of` sobre iteradores porque el proyecto compila con `target: es5` y
 *  sin `downlevelIteration`. El patron debe llevar la bandera `g`. */
function eachMatch(source: string, pattern: RegExp, onMatch: (m: RegExpExecArray) => void): void {
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    onMatch(match)
    if (match.index === pattern.lastIndex) pattern.lastIndex++
  }
}

const cssFiles = collectCssFiles(SRC)

/** Custom properties declaradas en cualquier fichero CSS del proyecto. */
const defined = new Set<string>()
for (const file of cssFiles) {
  eachMatch(stripNonCss(readFileSync(file, 'utf8')), /(--[\w-]+)\s*:/g, (match) => {
    if (match[1]) defined.add(match[1])
  })
}

describe('custom properties CSS', () => {
  it('encuentra ficheros CSS que auditar', () => {
    // Si el recorrido fallara, el resto de tests pasarian sin comprobar nada.
    expect(cssFiles.length).toBeGreaterThan(20)
  })

  it('cubre todos los modulos CSS del proyecto, no solo los de app/', () => {
    // Guarda contra un error de ruta: si SRC quedara mal resuelto, el
    // recorrido seria mas corto y el test pasaria sin comprobar casi nada.
    const outsideApp = cssFiles.filter((f) => !f.startsWith(join(SRC, 'app')))
    expect(outsideApp.length, 'deberia incluir CSS de components/ y app/dashboard/').toBeGreaterThan(5)
  })

  it('todo var(--token) sin fallback esta definido', () => {
    const unresolved: string[] = []

    for (const file of cssFiles) {
      const relative = file.slice(SRC.length + 1)
      const source = stripNonCss(readFileSync(file, 'utf8'))
      source.split('\n').forEach((line, index) => {
        // El caracter tras el nombre dice si hay fallback: ')' no lo hay,
        // ',' si. Con fallback la declaracion es valida aunque falte el token.
        eachMatch(line, /var\(\s*(--[\w-]+)\s*([,)])/g, (match) => {
          const token = match[1]
          // Un token empieza siempre por '--', asi que el truthiness descarta
          // tanto el undefined de noUncheckedIndexedAccess como capturas vacias.
          if (!token) return
          const hasFallback = match[2] === ','
          if (hasFallback || defined.has(token) || RUNTIME_INJECTED.has(token)) return
          unresolved.push(`${relative}:${index + 1}  ${token}`)
        })
      })
    }

    expect(
      unresolved,
      `Tokens CSS referenciados pero nunca definidos. Se caen a su valor ` +
        `heredado sin dar error. Anadelos a los bloques de tema de ` +
        `src/app/globals.css:\n  ${unresolved.join('\n  ')}`,
    ).toEqual([])
  })

  it('el token de next/font no se redeclara en :root', () => {
    // next/font lo inyecta en runtime. Si :root lo redefine, gana la cascada y
    // var(--font-inter) pasa a ser una pila de fallback: se pierde el woff2
    // auto-hospedado y su preload, en silencio.
    const globals = readFileSync(GLOBALS, 'utf8')
    const rootBlock = globals.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(rootBlock, '`--font-inter` no debe redefinirse en :root').not.toMatch(/--font-inter\s*:/)
  })
})
