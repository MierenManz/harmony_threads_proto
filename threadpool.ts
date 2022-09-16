interface PoolOptions {
  sabByteSize: number;
  workerCount?: number;
}

interface WorkerContext {
  worker: Worker;
  dataView: Uint8Array;
  lengthView: Uint32Array;
  availabilityView: Uint8Array;
}

export class Threadpool {
  workers: WorkerContext[];

  constructor(path: string | URL, options: PoolOptions) {
    if (options.sabByteSize % 4 !== 0) {
      throw new Error("SAB size should be divisable by 4");
    }

    this.workers = [];
    this.workers.length = options.workerCount || 4;

    for (let i = 0; i < this.workers.length; i++) {
      const rawSAB = new SharedArrayBuffer(options.sabByteSize);
      const lengthView = new Uint32Array(new SharedArrayBuffer(4));
      const availabilityView = new Uint8Array(new SharedArrayBuffer(1)).fill(1);

      const worker = new Worker(path, {
        type: "module",
        name: `Threadpool worker ${i}`,
      });
      worker.onmessage = () => {
        worker.postMessage({
          lengthSAB: lengthView.buffer,
          dataSAB: rawSAB,
          availabilitySAB: availabilityView.buffer,
          id: i,
        });
      };

      this.workers[i] = {
        dataView: new Uint8Array(rawSAB),
        worker,
        lengthView,
        availabilityView,
      };
    }
  }

  terminate() {
    while (true) {
      if (this.workers.every((x) => x.availabilityView[0] === 1)) {
        break;
      }
    }

    this.workers.forEach((x) => {
      x.worker.postMessage(null);
      x.worker.terminate();
    });
  }

  async queue(data: Uint8Array) {
    // Eagerly check for worker that does nothing
    let maybeWorker = this.workers.find((x) => x.availabilityView[0] === 1);
    // console.log(maybeWorker);
    // If worker was found
    if (maybeWorker) {
      maybeWorker.lengthView[0] = data.length;
      maybeWorker.availabilityView[0] = 0;
      maybeWorker.dataView.set(data);
    }

    while (true) {
      maybeWorker = this.workers.find((x) => x.availabilityView[0] === 1);
      if (maybeWorker) {
        maybeWorker.lengthView[0] = data.length;
        maybeWorker.availabilityView[0] = 0;
        maybeWorker.dataView.set(data);
        break;
      }

      await new Promise((res) => setTimeout(res, 10));
    }
  }
}

const t = new Threadpool(new URL("./empty.ts", import.meta.url), {
  sabByteSize: 16,
  workerCount: 1,
});
