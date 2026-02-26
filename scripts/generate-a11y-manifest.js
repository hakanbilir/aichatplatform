const fs = require('fs');
const path = require('path');

const manifest = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  components: [
    {
      name: 'GlassPanel',
      role: 'region',
      description: 'A container with refractive glass effect',
      accessibility: {
        contrastRatio: 'AAA (when on dark background)',
        prefersReducedMotion: 'Supported (Eco Mode disables blur)',
        ariaLabel: 'Content panel',
      },
    },
    {
      name: 'SpecularButton',
      role: 'button',
      description: 'Button with kinetic highlight',
      accessibility: {
        keyboardNavigable: true,
        focusIndicator: '2px solid blue',
        contrastRatio: '4.5:1',
      },
    },
    {
      name: 'BentoGrid',
      role: 'grid',
      description: 'Layout grid',
      accessibility: {
        readingOrder: 'Left-to-right, Top-to-bottom',
        responsive: true,
      },
    },
  ],
  globalFeatures: {
    ecoMode: {
      enabled: true,
      description: 'Disables blur and animations for accessibility and battery saving',
    },
    kineticTypography: {
      enabled: true,
      description: 'Variable font weight adjustments based on interaction',
    },
  },
};

const outputPath = path.join(__dirname, '../apps/web/public/accessibility-manifest.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Accessibility manifest generated at ${outputPath}`);
