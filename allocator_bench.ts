import { iterBenchSync } from "https://crux.land/3iJqdU";
import { Allocator } from "./allocator.ts";
interface BenchStats {
  iters: number;
  msPerIter: number;
  itersPerSecond: number;
}

function fixBench(b: BenchStats) {
  return {
    iters: b.iters,
    itersPerSecond: parseFloat(b.itersPerSecond.toFixed(0)),
    msPerIter: parseFloat(b.msPerIter.toFixed(5)),
  };
}

console.log("start");
const a = new Allocator(1e7);
const alloc4 = iterBenchSync(1e7 / 4, () => a.alloc(4));
let i = -4;
const drop4 = iterBenchSync(1e7 / 4, () => a.drop(i += 4));
iterBenchSync(1e7 / 4, () => a.alloc(4));
i += 4;
const dropRev4 = iterBenchSync(1e7 / 4, () => a.drop(i -= 4));

console.log("4 byte bench done");

const b = new Allocator(1e7 * 8);

const alloc32 = iterBenchSync(1e7 / 4, () => b.alloc(32));
i = -32;
const drop32 = iterBenchSync(1e7 / 4, () => b.drop(i += 32));
iterBenchSync(1e7 / 4, () => b.alloc(32));
i += 32;
const dropRev32 = iterBenchSync(1e7 / 4, () => b.drop(i -= 32));

console.log({
  alloc4: fixBench(alloc4),
  drop4: fixBench(drop4),
  dropRev4: fixBench(dropRev4),
});
console.log({
  alloc32: fixBench(alloc32),
  drop32: fixBench(drop32),
  dropRev32: fixBench(dropRev32),
});
