const fs = require('fs');
const path = require('path');

const kineticDir = path.join(__dirname, '../src/components/ui/kinetic');
const publicDir = path.join(__dirname, '../public');

// Nutrition Label Data (Manual Audit Map)
const componentAudit = {
  GlassPanel: {
    roles: ['region'],
    contrast: '4.5:1 (calculated for glass)',
    notes: 'Ensure backdrop-filter is disabled in high-contrast/eco mode.',
  },
  SpecularButton: {
    roles: ['button'],
    contrast: 'AA Pass',
    notes: 'Interactive highlights do not interfere with text legibility. Focus states preserved.',
  },
  BentoGrid: {
    roles: ['grid', 'presentation'],
    contrast: 'N/A (Layout)',
    notes: 'Grid gap (24px) ensures clear separation of content.',
  },
  KineticTypography: {
    roles: ['heading', 'text'],
    contrast: 'AAA Pass',
    notes: 'Variable font weight changes do not affect layout shift significantly.',
  },
};

const components = [];

if (fs.existsSync(kineticDir)) {
  const files = fs.readdirSync(kineticDir);
  files.forEach((file) => {
    if (file.endsWith('.tsx')) {
      const name = path.basename(file, '.tsx');
      if (componentAudit[name]) {
        components.push({
          name,
          ...componentAudit[name],
          status: 'Audited',
        });
      } else {
        components.push({
          name,
          status: 'Pending Audit',
        });
      }
    }
  });
}

const manifest = {
  version: '2026.1.0',
  timestamp: new Date().toISOString(),
  standard: 'WCAG 2.1 AA + Kinetic 2026',
  components,
  summary: 'Kinetic design system accessibility manifest generated.',
};

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(
  path.join(publicDir, 'accessibility-manifest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log('Accessibility manifest generated with ' + components.length + ' components.');
