#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const GENERATOR_VERSION = '1.0.0';
const ROOT = process.cwd();
const TEMPLATE_PATH = path.join(ROOT, 'scripts/devfollowme/template.tr.md');
const OUTPUT_MD_PATH = path.join(ROOT, 'DeveloperFollowMe.md');
const OUTPUT_PROFILE_PATH = path.join(ROOT, 'docs/_generated/devfollowme.repo-profile.json');

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.turbo',
  '.next',
  'dist',
  'build',
  'coverage',
  '.idea',
  '.vscode',
]);

const DEFAULT_SECTION =
  '- Bulgu yok. Bu bölüm otomatik tarama ile veri bulamadı; manuel gözden geçirme önerilir.';

const toPosix = (value) => value.split(path.sep).join('/');
const sortUnique = (items) => [...new Set(items)].sort((a, b) => a.localeCompare(b));

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function safeReadJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function walk(dir, collector) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      await walk(fullPath, collector);
      continue;
    }

    collector(toPosix(path.relative(ROOT, fullPath)), entry.name);
  }
}

function formatList(items, emptyMessage = DEFAULT_SECTION) {
  if (!items.length) {
    return emptyMessage;
  }
  return items.map((item) => `- ${item}`).join('\n');
}

function isEnvExample(fileName) {
  const lower = fileName.toLowerCase();
  return lower.includes('example') || lower.endsWith('.sample') || lower.endsWith('.template');
}

function detectPackageManager(rootPackageJson) {
  const managerSpec = rootPackageJson?.packageManager ?? '';
  if (managerSpec.startsWith('pnpm@')) return { name: 'pnpm', spec: managerSpec };
  if (managerSpec.startsWith('yarn@')) return { name: 'yarn', spec: managerSpec };
  if (managerSpec.startsWith('npm@')) return { name: 'npm', spec: managerSpec };
  if (managerSpec.startsWith('bun@')) return { name: 'bun', spec: managerSpec };
  return { name: 'unknown', spec: managerSpec || 'not-declared' };
}

function detectMonorepoTool(rootPackageJson, allFiles) {
  const hasTurboScript = Boolean(
    rootPackageJson?.scripts &&
    Object.values(rootPackageJson.scripts).some((value) => String(value).includes('turbo run')),
  );
  if (hasTurboScript || allFiles.includes('turbo.json')) return 'turbo';
  if (allFiles.includes('nx.json')) return 'nx';
  if (allFiles.includes('lerna.json')) return 'lerna';
  return 'unknown';
}

async function detectNodeVersion(rootPackageJson) {
  if (await exists(path.join(ROOT, '.nvmrc'))) {
    const value = (await fs.readFile(path.join(ROOT, '.nvmrc'), 'utf8')).trim();
    return { source: '.nvmrc', value: value || 'unknown' };
  }
  if (rootPackageJson?.volta?.node)
    return { source: 'package.json#volta.node', value: rootPackageJson.volta.node };
  if (rootPackageJson?.engines?.node)
    return { source: 'package.json#engines.node', value: rootPackageJson.engines.node };
  return { source: 'not-found', value: 'unknown' };
}

async function buildProfile() {
  const rootPackageJson = await safeReadJson(path.join(ROOT, 'package.json'));
  const rootScripts = rootPackageJson?.scripts ?? {};

  const workspacePackageJsonFiles = [];
  const allFiles = [];

  await walk(ROOT, (relativePath, fileName) => {
    allFiles.push(relativePath);
    if (fileName === 'package.json' && relativePath !== 'package.json') {
      workspacePackageJsonFiles.push(relativePath);
    }
  });

  const workspacePackages = [];
  for (const packageJsonRelativePath of sortUnique(workspacePackageJsonFiles)) {
    const packageJson = await safeReadJson(path.join(ROOT, packageJsonRelativePath));
    workspacePackages.push({
      path: packageJsonRelativePath,
      name: packageJson?.name ?? '(isimsiz-paket)',
      scripts: packageJson?.scripts ?? {},
      dependencies: packageJson?.dependencies ?? {},
      devDependencies: packageJson?.devDependencies ?? {},
    });
  }

  const ciWorkflows = sortUnique(
    allFiles.filter((file) => file.startsWith('.github/workflows/') && file.endsWith('.yml')),
  );
  const docsFiles = sortUnique(
    allFiles.filter(
      (file) =>
        file === 'README.md' ||
        file.startsWith('docs/') ||
        file === 'PM2_GUIDE.md' ||
        file === 'security.md',
    ),
  );

  const dockerFiles = sortUnique(
    allFiles.filter((file) => {
      const base = path.basename(file);
      return (
        base.startsWith('Dockerfile') ||
        (base.startsWith('docker-compose') && (file.endsWith('.yml') || file.endsWith('.yaml')))
      );
    }),
  );

  const pm2Files = sortUnique(
    allFiles.filter((file) => path.basename(file).startsWith('ecosystem.config.')),
  );

  const expoDependency = workspacePackages.some(
    (pkg) => 'expo' in pkg.dependencies || 'expo' in pkg.devDependencies,
  );
  const mobileSignals = {
    iosDir: allFiles.some((file) => file.startsWith('ios/')),
    androidDir: allFiles.some((file) => file.startsWith('android/')),
    appJson: allFiles.includes('app.json'),
    reactNativeConfig: allFiles.some((file) => path.basename(file) === 'react-native.config.js'),
    expoDependency,
  };

  const envFiles = sortUnique(allFiles.filter((file) => path.basename(file).startsWith('.env')));
  const envExamples = envFiles.filter((file) => isEnvExample(path.basename(file)));
  const envIgnored = envFiles.filter((file) => !envExamples.includes(file));

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      generatorVersion: GENERATOR_VERSION,
    },
    repo: {
      packageManager: detectPackageManager(rootPackageJson),
      monorepoTool: detectMonorepoTool(rootPackageJson, allFiles),
      nodeVersion: await detectNodeVersion(rootPackageJson),
      rootScripts,
      workspacePackages,
      ciWorkflows,
      docsFiles,
      dockerFiles,
      pm2Files,
      mobileSignals,
      envExamples,
      envIgnored,
    },
  };
}

function buildMarkdown(profile, template) {
  const { repo, metadata } = profile;
  const overviewSection = [
    `- **Paket yöneticisi:** ${repo.packageManager.name} (${repo.packageManager.spec})`,
    `- **Monorepo aracı:** ${repo.monorepoTool}`,
    `- **Node sürüm kaynağı:** ${repo.nodeVersion.source}`,
    `- **Node sürüm değeri:** ${repo.nodeVersion.value}`,
    `- **Workspace paket sayısı:** ${repo.workspacePackages.length}`,
    `- **CI workflow sayısı:** ${repo.ciWorkflows.length}`,
  ].join('\n');

  const repoStructureSection = [
    '### Uygulamalar',
    formatList(
      repo.workspacePackages
        .filter((pkg) => pkg.path.startsWith('apps/'))
        .map((pkg) => `\`${pkg.name}\` → \`${pkg.path}\``),
      '- Uygulama paketi bulunamadı.',
    ),
    '',
    '### Paketler',
    formatList(
      repo.workspacePackages
        .filter((pkg) => pkg.path.startsWith('packages/'))
        .map((pkg) => `\`${pkg.name}\` → \`${pkg.path}\``),
      '- Kütüphane/yardımcı paket bulunamadı.',
    ),
  ].join('\n');

  const rootScriptLines = Object.entries(repo.rootScripts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, command]) => `\`${name}\`: \`${command}\``);

  const workspaceScriptLines = repo.workspacePackages
    .map((pkg) => {
      const scriptEntries = Object.entries(pkg.scripts).sort(([a], [b]) => a.localeCompare(b));
      if (!scriptEntries.length) {
        return `\`${pkg.name}\` (${pkg.path}): script tanımlı değil.`;
      }
      const importantScripts = scriptEntries
        .filter(([name]) => ['dev', 'build', 'start', 'lint', 'test', 'typecheck'].includes(name))
        .map(([name, command]) => `\`${name}\` → \`${command}\``);
      const scriptPreview = importantScripts.length
        ? importantScripts.join(' | ')
        : 'önemli script bulunamadı.';
      return `\`${pkg.name}\` (${pkg.path}): ${scriptPreview}`;
    })
    .sort((a, b) => a.localeCompare(b));

  const scriptsSection = [
    '### Kök scriptler',
    formatList(rootScriptLines, '- Kök package.json içinde script bulunamadı.'),
    '',
    '### Workspace script özetleri',
    formatList(workspaceScriptLines, '- Workspace script özeti üretilemedi.'),
  ].join('\n');

  const mobileDetectionText = [
    `- ios/ klasörü: ${repo.mobileSignals.iosDir ? 'var' : 'yok'}`,
    `- android/ klasörü: ${repo.mobileSignals.androidDir ? 'var' : 'yok'}`,
    `- app.json: ${repo.mobileSignals.appJson ? 'var' : 'yok'}`,
    `- react-native.config.js: ${repo.mobileSignals.reactNativeConfig ? 'var' : 'yok'}`,
    `- expo bağımlılığı: ${repo.mobileSignals.expoDependency ? 'tespit edildi' : 'tespit edilmedi'}`,
  ].join('\n');

  const opsSection = [
    '### PM2',
    formatList(
      repo.pm2Files.map((file) => `\`${file}\``),
      '- PM2 ecosystem dosyası tespit edilmedi.',
    ),
    '',
    '### Docker',
    formatList(
      repo.dockerFiles.map((file) => `\`${file}\``),
      '- Dockerfile veya docker-compose dosyası tespit edilmedi.',
    ),
    '',
    '### Mobil sinyaller',
    mobileDetectionText,
  ].join('\n');

  const envSection = [
    '### Güvenli okunan env dosyaları',
    formatList(
      repo.envExamples.map((file) => `\`${file}\``),
      '- Örnek env dosyası bulunamadı.',
    ),
    '',
    '### Bilinçli olarak okunmayan env dosyaları',
    formatList(
      repo.envIgnored.map((file) => `\`${file}\` (gizli değer riski nedeniyle içerik okunmadı)`),
      '- İçeriği saklı env dosyası tespit edilmedi.',
    ),
  ].join('\n');

  const ciSection = [
    '### CI workflow dosyaları',
    formatList(
      repo.ciWorkflows.map((file) => `\`${file}\``),
      '- CI workflow dosyası bulunamadı.',
    ),
    '',
    '### Dokümantasyon kaynakları',
    formatList(
      repo.docsFiles.map((file) => `\`${file}\``),
      '- Dokümantasyon dosyası bulunamadı.',
    ),
    '',
    '- Bu doküman `docs:devfollowme:check` adımıyla drift kontrolüne tabidir.',
  ].join('\n');

  const unknowns = [];
  if (!repo.dockerFiles.length) {
    unknowns.push(
      '- Konteyner dağıtımı için Docker tanımı bulunamadı; ihtiyaç varsa Dockerfile eklenmeli.',
    );
  }
  if (
    !repo.mobileSignals.iosDir &&
    !repo.mobileSignals.androidDir &&
    !repo.mobileSignals.appJson &&
    !repo.mobileSignals.reactNativeConfig
  ) {
    unknowns.push(
      '- Mobil uygulama iskeleti tespit edilmedi; mobil hedef varsa klasör yapısı netleştirilmeli.',
    );
  }
  if (repo.monorepoTool === 'unknown') {
    unknowns.push('- Monorepo aracı otomatik tespit edilemedi; proje yapısı manuel doğrulanmalı.');
  }
  const unknownsSection = unknowns.length
    ? unknowns.join('\n')
    : '- Kritik bilinmeyen bulunmadı; tespit edilen alanlar düzenli görünüyor.';

  const followMeSection = [
    '1. `npm run docs:devfollowme` komutunu çalıştırarak dokümanı güncelle.',
    '2. Üretilen içerikte “Bilinmeyenler” bölümünü insan gözüyle doğrula ve gerekirse kaynak dosya ekle.',
    '3. CI öncesi `npm run docs:devfollowme:check` ile drift kontrolü yap.',
    '4. Yeni app/package eklendiğinde `package.json` scriptlerini tanımla; üretici bunları otomatik listeleyecektir.',
    '5. `.env` gerçek dosyalarına sır veya anahtar koyulsa dahi bu üretici içerik okumaz; yalnızca dosya adlarını raporlar.',
  ].join('\n');

  return template
    .replace('{{lastGenerated}}', metadata.generatedAt)
    .replace('{{generatorVersion}}', metadata.generatorVersion)
    .replace('{{overviewSection}}', overviewSection)
    .replace('{{repoStructureSection}}', repoStructureSection)
    .replace('{{scriptsSection}}', scriptsSection)
    .replace('{{opsSection}}', opsSection)
    .replace('{{envSection}}', envSection)
    .replace('{{ciSection}}', ciSection)
    .replace('{{unknownsSection}}', unknownsSection)
    .replace('{{followMeSection}}', followMeSection);
}

async function writeOutputs(markdown, profile) {
  await fs.mkdir(path.dirname(OUTPUT_PROFILE_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_MD_PATH, `${markdown.trimEnd()}\n`, 'utf8');
  await fs.writeFile(OUTPUT_PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
}

async function main() {
  const profile = await buildProfile();
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  const markdown = buildMarkdown(profile, template);
  await writeOutputs(markdown, profile);
  process.stdout.write('DeveloperFollowMe.md generated successfully.\n');
}

main().catch((error) => {
  process.stderr.write(
    `Generator failed: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exit(1);
});
