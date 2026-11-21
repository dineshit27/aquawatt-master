import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function collectSourceFiles(dirPath: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe('Schema Parity, Package Hygiene & Remediation Integrity', () => {
  it('keeps supabase/schema.sql and migration SQL structurally identical apart from header line', () => {
    const schemaSql = readProjectFile('supabase/schema.sql');
    const migrationSql = readProjectFile(
      'supabase/migrations/20261106000000_create_aquawatt_schema.sql'
    );

    const normalizeHeader = (sql: string) =>
      sql
        .replace(/-- AquaWatt IoT Telemetry Platform - .*\n/, '-- HEADER\n')
        .replace(/-- (File|Migration): .*\n/, '-- IDENTIFIER\n');

    assert.strictEqual(normalizeHeader(schemaSql), normalizeHeader(migrationSql));

    for (const content of [schemaSql, migrationSql]) {
      assert.ok(content.includes('CREATE OR REPLACE FUNCTION public.handle_new_user()'));
      assert.ok(content.includes('AFTER INSERT ON auth.users'));
      assert.ok(content.includes('ON CONFLICT (id) DO NOTHING'));
      assert.ok(content.includes("'YOUR_AUTH_USER_UUID'::uuid"));
      assert.ok(!content.includes('52.1'));
      assert.ok(!content.includes('21.4'));
      assert.ok(content.includes('ENABLE ROW LEVEL SECURITY'));
      assert.ok(content.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings'));
    }
  });

  it('verifies package.json scripts, clean naming, and README security/honesty sections', () => {
    const pkg = JSON.parse(readProjectFile('package.json')) as {
      name: string;
      scripts: Record<string, string>;
    };

    assert.strictEqual(pkg.name, 'aquawatt');
    assert.strictEqual(pkg.scripts.lint, 'eslint .');
    assert.strictEqual(pkg.scripts.typecheck, 'tsc --noEmit');
    assert.ok(pkg.scripts.build.includes('vite build'));

    const readme = readProjectFile('README.md');
    assert.ok(readme.includes('FS-S401'));
    assert.ok(readme.includes('INA219'));
    assert.ok(readme.includes('Calibration Pending'));
    assert.ok(readme.includes('RFC 9728'));
    assert.ok(readme.includes('What Is NOT Implemented'));
    assert.ok(readme.includes('YOUR_AUTH_USER_UUID'));
  });

  it('prevents regressions of removed unverified hardware claims and fabricated social proof in src/', () => {
    const srcFiles = collectSourceFiles(path.join(ROOT_DIR, 'src'));
    const forbiddenPatterns: Array<{ label: string; regex: RegExp }> = [
      { label: 'YF-S201', regex: /YF-S201/i },
      { label: 'SCT-013', regex: /SCT-013/i },
      { label: '16-bit FFT', regex: /16-bit FFT/i },
      { label: 'Elena Vance-Morgan', regex: /Elena Vance-Morgan/i },
      { label: 'R. Sharma', regex: /R\. Sharma/i },
      { label: 'P. Mehta', regex: /P\. Mehta/i },
      { label: 'A. Patel', regex: /A\. Patel/i },
      { label: '3.4M+', regex: /3\.4M\+/i },
      { label: '4,820 Total Members', regex: /4,820 Total Members/i },
      { label: '99.98% Gateway Uptime', regex: /99\.98% Gateway Uptime/i },
      { label: 'Guaranteed SLA Response', regex: /Guaranteed SLA Response/i },
      { label: '4120 7700', regex: /4120 7700/ },
    ];

    for (const file of srcFiles) {
      const text = fs.readFileSync(file, 'utf8');
      for (const { label, regex } of forbiddenPatterns) {
        assert.strictEqual(
          regex.test(text),
          false,
          `Found forbidden pattern "${label}" in ${path.relative(ROOT_DIR, file)}`
        );
      }
    }
  });
});
