/// <reference lib="deno.worker" />

export class Worker {
  dataView!: Uint8Array;
  datalengthView!: Uint32Array;
  availabilityView!: Uint8Array;
  isConnected: boolean;
  terminate: boolean;
  id!: number;
  constructor() {
    this.isConnected = false;
    this.terminate = false;
    self.onmessage = (msg) => {
      this.dataView = new Uint8Array(msg.data.dataSAB);
      this.datalengthView = new Uint32Array(msg.data.lengthSAB);
      this.availabilityView = new Uint8Array(msg.data.availabilitySAB);
      this.id = msg.data.id;
      this.isConnected = true;
      self.onmessage = () => this.terminate = true;
    };

    self.postMessage(null);
  }

  [Symbol.asyncIterator]() {
    return {
      next: async () => {
        while (!this.isConnected) {
          await new Promise((res) => setTimeout(res, 20));
        }
        while (this.availabilityView[0] === 1) {
          await new Promise((res) => setTimeout(res, 10));
        }

        const copy = this.dataView.slice(0, this.datalengthView[0]);
        this.availabilityView[0] = 1;
        // console.log(copy.buffer);
        return {
          value: copy,
          done: this.terminate,
        };
      },
    };
  }
}
