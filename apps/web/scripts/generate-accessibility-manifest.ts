import fs from 'fs';
import path from 'path';

const manifest = {
  version: "2026.1.0",
  generatedAt: new Date().toISOString(),
  compliance: {
    wcag: "2.1 AA",
    section508: true
  },
  features: {
    ecoMode: {
      enabled: true,
      description: "Disables blur, refraction, and animations for reduced motion/battery.",
      toggle: "User preference or System setting"
    },
    kineticTypography: {
      enabled: true,
      description: "Variable fonts adapt weight based on interaction.",
      fallback: "Standard sans-serif weight"
    }
  },
  components: {
    "kinetic-glass-panel": {
      role: "region",
      contrastRatio: "4.5:1 (Content vs Background)",
      keyboardNavigation: "Pass through",
      attributes: ["data-eco-mode"]
    },
    "specular-button": {
      role: "button",
      contrastRatio: "> 7:1",
      keyboardNavigation: "Focusable (Tab)",
      states: ["hover", "focus", "active"],
      aria: {
        required: ["aria-label", "aria-pressed (if toggle)"]
      }
    },
    "bento-grid": {
      role: "none (Layout)",
      description: "Grid layout managing focus order logically from top-left to bottom-right.",
      gap: "24px"
    }
  },
  colorPalette: {
    glassBackground: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.15)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.7)"
  }
};

const outputPath = path.join(process.cwd(), 'apps/web/public/accessibility-manifest.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Generated Accessibility Nutrition Label at ${outputPath}`);
