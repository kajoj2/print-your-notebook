// `just from-web '<link>' <name>`: a design from the website (the "Copy link" link) as an insert
// to print from the CLI. Writes inserts/<name>.typ (sections) and inserts/<name>.toml (appearance),
// with the same code the website uses to compile the preview.
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { configFromHash } from '../src/notebook/share.ts';
import { toInsertFiles } from '../src/notebook/typst.ts';

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const [link, name] = args.filter((a) => a !== '--force');
if (!link || !name) fail("usage: just from-web '<link from the website>' <name> [--force]");
if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
  fail(`name '${name}': lowercase letters, digits and '-' only`);

// the full address, just the fragment (#c=…) or just c=…
const hash = link.includes('#') ? link.slice(link.indexOf('#')) : link;
const cfg = configFromHash(hash);
if (!cfg) fail('the link has no design (#c=…); copy it with the “Copy link” button');

const dir = fileURLToPath(new URL('../../inserts/', import.meta.url));
const typ = `${dir}${name}.typ`;
const toml = `${dir}${name}.toml`;
const existing = [typ, toml].filter((p) => existsSync(p));
if (existing.length && !force) {
  fail(
    `inserts/${name}.typ or .toml already exists; --force overwrites it (manual edits will be lost)`,
  );
}

const files = toInsertFiles(cfg);
writeFileSync(typ, files.typ);
writeFileSync(toml, files.toml);
console.log(`✓ inserts/${name}.typ   notebook sections`);
console.log(`✓ inserts/${name}.toml  size, margins, grid, font, colours`);
