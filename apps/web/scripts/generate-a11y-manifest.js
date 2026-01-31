
const fs = require('fs');
const path = require('path');

const components = [
  {
    name: 'GlassPanel',
    role: 'region',
    contrastRatio: '4.5:1 (with background blur)',
    keyboardNavigation: 'Tabindex 0 if interactive',
    ariaAttributes: ['aria-label', 'aria-describedby'],
    description: 'A frosted glass container for grouping content.'
  },
  {
    name: 'SpecularButton',
    role: 'button',
    contrastRatio: '7:1 (Text to Button Background)',
    keyboardNavigation: 'Focusable via Tab, Enter/Space to activate',
    ariaAttributes: ['aria-pressed', 'aria-disabled'],
    description: 'A button with mouse-tracking specular highlight.'
  },
  {
    name: 'BentoGrid',
    role: 'grid (or presentation)',
    contrastRatio: 'N/A',
    keyboardNavigation: 'Sequential navigation through grid items',
    ariaAttributes: [],
    description: 'CSS Grid layout for dashboard widgets.'
  },
  {
    name: 'KineticTypography',
    role: 'heading',
    contrastRatio: '4.5:1',
    keyboardNavigation: 'N/A',
    ariaAttributes: ['aria-level'],
    description: 'Variable font text that reacts to user interaction.'
  }
];

const manifest = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  standard: 'WCAG 2.1 AA',
  components: components
};

const outputPath = path.join(__dirname, '../public/accessibility-manifest.json');

// Ensure public dir exists
const publicDir = path.dirname(outputPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`Accessibility manifest generated at ${outputPath}`);
