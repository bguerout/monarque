import fs from "fs";
import cluster, { Worker } from "cluster";
import { VassalMessage } from "./VassalMessage";
import { ConsoleLogger, Logger } from "./Logger";

type MonarqueOptions = { pidFile?: string; logger?: Logger };

export class Monarque {
  private workers: Map<number, Worker>;
  private workerCount: number;
  private options: MonarqueOptions;
  private logger: Logger;

  constructor(workerCount: number, options: MonarqueOptions = {}) {
    this.workerCount = workerCount;
    this.options = options;
    this.workers = new Map();
    this.logger = options.logger || new ConsoleLogger();
    this.registerReloadListener();
  }

  async start() {
    this.logger.info(
      `Starting cluster ${process.pid} with ${this.workerCount} instances...`,
    );

    for (let i = 0; i < this.workerCount; i++) {
      await this.startWorker();
    }

    if (this.options.pidFile) {
      fs.writeFileSync(this.options.pidFile, process.pid.toString(), "utf8");
    }
  }

  async shutdown() {
    for (const worker of this.getWorkers()) {
      this.logger.info(
        `Sending graceful shutdown signal to worker ${worker.process.pid}...`,
      );
      await this.shutdownWorker(worker);
    }
  }

  async reload() {
    for (const worker of this.getWorkers()) {
      this.logger.info(`Reloading worker ${worker.process.pid}...`);
      await this.shutdownWorker(worker);
      await this.startWorker();
    }
  }

  private async startWorker() {
    const worker = await this.createWorker();
    worker.on("error", async (err) => {
      this.logger.error(
        err,
        `Worker ${worker.process.pid} encountered an error.`,
      );
    });
    worker.on("exit", () => {
      this.logger.info(`Worker ${worker.process.pid} exited.`);
    });

    this.workers.set(worker.process.pid!, worker);

    return worker;
  }

  private async shutdownWorker(worker: Worker) {
    await new Promise<number>((resolve, reject) => {
      worker.once("exit", (exitCode: number) =>
        exitCode === 0 ? resolve(0) : reject(exitCode),
      );
      worker.send({ status: "shutdown" });
    });
    this.workers.delete(worker.process.pid!);
  }

  private createWorker() {
    return new Promise<Worker>((resolve) => {
      const worker = cluster.fork();
      worker.once("message", (msg: VassalMessage) => {
        if (msg.status === "ready") {
          this.logger.debug(`Worker ${worker.process.pid} is ready.`);
          resolve(worker);
        }
      });
    });
  }

  private getWorkers() {
    return Array.from(this.workers.values());
  }

  private registerReloadListener() {
    process.on("SIGHUP", async () => {
      this.logger.info("Received SIGHUP signal. Reloading...");
      await this.reload();
    });
  }
}
