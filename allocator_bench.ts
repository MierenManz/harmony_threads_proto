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

const b = new Allocator(1e7 * 16);

const alloc64 = iterBenchSync(1e7 / 4, () => b.alloc(64));
i = -64;
const drop64 = iterBenchSync(1e7 / 4, () => b.drop(i += 64));
iterBenchSync(1e7 / 4, () => b.alloc(64));
i += 64;
const dropRev64 = iterBenchSync(1e7 / 4, () => b.drop(i -= 64));

console.log({
  alloc4: fixBench(alloc4),
  drop4: fixBench(drop4),
  dropReverse4: fixBench(dropRev4),
});
console.log({
  alloc64: fixBench(alloc64),
  drop64: fixBench(drop64),
  dropReverse64: fixBench(dropRev64),
});
