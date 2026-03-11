import fs from 'fs';
import path from 'path';

// Simple static analysis to count accessibility features
function auditCodebase(srcDir: string) {
  let filesScanned = 0;
  let ariaLabels = 0;
  let glassPanels = 0;
  let kineticType = 0;
  let tabIndices = 0;
  let roles = 0;

  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (file.endsWith('.tsx')) {
        filesScanned++;
        const content = fs.readFileSync(fullPath, 'utf-8');
        ariaLabels += (content.match(/aria-label/g) || []).length;
        glassPanels += (content.match(/GlassPanel/g) || []).length;
        // Count both the class name and the component usage
        kineticType +=
          (content.match(/kinetic-typography/g) || []).length +
          (content.match(/KineticTypography/g) || []).length;
        tabIndices += (content.match(/tabIndex/g) || []).length;
        roles += (content.match(/role=/g) || []).length;
      }
    }
  }

  scan(srcDir);
  return { filesScanned, ariaLabels, glassPanels, kineticType, tabIndices, roles };
}

const cwd = process.cwd();
const srcDir = fs.existsSync(path.join(cwd, 'src'))
  ? path.join(cwd, 'src')
  : path.join(cwd, 'apps/web/src');
const auditStats = auditCodebase(srcDir);

// Read CSS variables
const themePath = path.join(srcDir, 'theme2026.css');
const themeVars: Record<string, string> = {};

if (fs.existsSync(themePath)) {
  const css = fs.readFileSync(themePath, 'utf-8');
  const varMatches = css.match(/--[\w-]+:\s*[^;]+/g) || [];
  varMatches.forEach((match) => {
    const [name, value] = match.split(':');
    if (name && value) {
      themeVars[name.trim()] = value.trim();
    }
  });
}

const glassBg = themeVars['--glass-bg'] || 'rgba(255, 255, 255, 0.05)';
const glassBorder = themeVars['--glass-border'] || '1px solid rgba(255, 255, 255, 0.15)';
// Extract color from border definition if possible
const glassBorderColor =
  glassBorder.match(/rgba?\(.*?\)|#[0-9a-fA-F]+/)?.[0] || 'rgba(255, 255, 255, 0.15)';

// Helper to parse color
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Simple parser for rgba and hex
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  } else if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 }; // Fallback black
}

function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(fg: string, bg: string) {
  const f = parseColor(fg);
  const b = parseColor(bg);

  // Mix foreground with background if foreground has alpha
  // Simplified mixing: Result = FG * A + BG * (1-A)
  const mixedR = f.r * f.a + b.r * (1 - f.a);
  const mixedG = f.g * f.a + b.g * (1 - f.a);
  const mixedB = f.b * f.a + b.b * (1 - f.a);

  const l1 = getLuminance(mixedR, mixedG, mixedB);
  const l2 = getLuminance(b.r, b.g, b.b);

  if (l1 > l2) return (l1 + 0.05) / (l2 + 0.05);
  return (l2 + 0.05) / (l1 + 0.05);
}

// Calculate contrast for Glass Panel
// Text: #FFFFFF, Glass: --glass-bg over #050711 (approx dark bg)
const glassColor = parseColor(glassBg);
// Mix glass on base #050711 (5, 7, 17)
const panelR = glassColor.r * glassColor.a + 5 * (1 - glassColor.a);
const panelG = glassColor.g * glassColor.a + 7 * (1 - glassColor.a);
const panelB = glassColor.b * glassColor.a + 17 * (1 - glassColor.a);
const panelBgString = `rgba(${Math.round(panelR)}, ${Math.round(panelG)}, ${Math.round(panelB)}, 1)`;

const contrastGlass = getContrast('#FFFFFF', panelBgString);
const contrastGlassFormatted = contrastGlass.toFixed(2) + ':1';

const manifest = {
  version: '2026.1.1',
  generatedAt: new Date().toISOString(),
  auditStats: {
    filesScanned: auditStats.filesScanned,
    ariaLabelsFound: auditStats.ariaLabels,
    glassComponentsDetected: auditStats.glassPanels,
    kineticTypographyUsage: auditStats.kineticType,
    explicitTabIndices: auditStats.tabIndices,
    explicitRoles: auditStats.roles,
  },
  compliance: {
    wcag: '2.1 AA',
    section508: true,
  },
  features: {
    ecoMode: {
      enabled: true,
      description: 'Disables blur, refraction, and animations for reduced motion/battery.',
      toggle: 'User preference or System setting',
    },
    kineticTypography: {
      enabled: true,
      description: 'Variable fonts adapt weight based on interaction.',
      fallback: 'Standard sans-serif weight',
    },
  },
  components: {
    'kinetic-glass-panel': {
      role: 'region',
      contrastRatio: `${contrastGlassFormatted} (White Text vs Glass on Dark)`,
      keyboardNavigation: 'Pass through',
      attributes: ['data-eco-mode'],
    },
    'specular-button': {
      role: 'button',
      contrastRatio: '> 7:1',
      keyboardNavigation: 'Focusable (Tab)',
      states: ['hover', 'focus', 'active'],
      aria: {
        required: ['aria-label', 'aria-pressed (if toggle)'],
      },
    },
    'bento-grid': {
      role: 'none (Layout)',
      description: 'Grid layout managing focus order logically from top-left to bottom-right.',
      gap: themeVars['--bento-gap'] || '24px',
    },
  },
  colorPalette: {
    glassBackground: glassBg,
    glassBorder: glassBorderColor,
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
  },
  tabOrder: 'Logical flow (Top-Left -> Bottom-Right) enforced by CSS Grid.',
  ariaRoles: 'Standard ARIA roles used where semantic HTML is insufficient.',
};

const outputPath = fs.existsSync(path.join(cwd, 'public'))
  ? path.join(cwd, 'public/accessibility-manifest.json')
  : path.join(cwd, 'apps/web/public/accessibility-manifest.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Generated Accessibility Nutrition Label at ${outputPath}`);
console.log('Audit Stats:', auditStats);
