import { it } from 'vitest';
import { evaluate, formatReport, loadSeed } from './evaluate';

const seedArg = process.env.SEED_TEST_SEED;

it('prints matching accuracy on the seed-test data', () => {
  const report = formatReport(evaluate(loadSeed(seedArg ? Number(seedArg) : undefined)));
  process.stderr.write(`\n${report}\n\n`);
});
