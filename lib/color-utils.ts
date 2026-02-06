// Default HSL values matching globals.css :root
export const DEFAULT_PRIMARY_HSL = "0 0% 98%"
export const DEFAULT_PRIMARY_FOREGROUND_HSL = "0 0% 9%"

/**
 * Convert a hex color string to an HSL string in the format "H S% L%"
 * used by the CSS custom properties.
 */
export function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return DEFAULT_PRIMARY_HSL

  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Convert an HSL string ("H S% L%") back to a hex color string.
 */
export function hslToHex(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return "#fafafa"

  const h = parseFloat(parts[0]) / 360
  const s = parseFloat(parts[1]) / 100
  const l = parseFloat(parts[2]) / 100

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculate relative luminance of a hex color (WCAG formula).
 */
export function getLuminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 1

  const [r, g, b] = [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Return a foreground HSL string (light or dark) that contrasts well
 * against the given hex background color.
 */
export function getForegroundForColor(hex: string): string {
  return getLuminance(hex) > 0.4 ? DEFAULT_PRIMARY_FOREGROUND_HSL : "0 0% 98%"
}

/**
 * Apply a primary color override to the document root.
 */
export function applyPrimaryColor(hex: string): void {
  const hsl = hexToHsl(hex)
  const fgHsl = getForegroundForColor(hex)
  document.documentElement.style.setProperty("--primary", hsl)
  document.documentElement.style.setProperty("--primary-foreground", fgHsl)
}

/**
 * Remove inline primary color overrides, reverting to globals.css defaults.
 */
export function resetPrimaryColor(): void {
  document.documentElement.style.removeProperty("--primary")
  document.documentElement.style.removeProperty("--primary-foreground")
}
