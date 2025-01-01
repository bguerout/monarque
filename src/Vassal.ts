import { VassalMessage } from "./VassalMessage";
import { InstanceProcess } from "./InstanceProcess";
import { ConsoleLogger, Logger } from "./Logger";

type VassalOptions = { logger?: Logger };

export class Vassal {
  private process: InstanceProcess;
  private logger: Logger;

  constructor(cip: InstanceProcess, options: VassalOptions = {}) {
    this.process = cip;
    this.logger = options.logger || new ConsoleLogger();
    this.registerShutdownListener();
  }

  async start() {
    try {
      await this.process.start();
      this.sendMessage({ status: "ready" });
    } catch (e) {
      this.logger.error(
        e,
        "Unable to start worker process. Exit worker with error",
      );
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  }

  async stop() {
    try {
      await this.process.stop();
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    } catch (e) {
      this.logger.error(
        e,
        "Unable to stop worker process. Exit worker with error",
      );
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  }

  private sendMessage(message: VassalMessage) {
    process.send?.(message);
  }

  private registerShutdownListener() {
    process.on("SIGINT", () => {
      this.logger.debug(
        `Signal SIGINT received but waiting for shutdown message from the master`,
      );
    });

    process.on("SIGTERM", () => {
      this.logger.debug(
        `Signal SIGTERM received but waiting for shutdown message from the master`,
      );
    });

    process.on("message", async (message: VassalMessage) => {
      if (message.status === "shutdown") {
        this.logger.debug(
          `Received shutdown message from master, closing server...`,
        );
        await this.stop();
      }
    });

    const interval = setInterval(async () => {
      if (!process.ppid || process.ppid === 1) {
        this.logger.warn(`Master process has exited. Shutting down...`);
        clearInterval(interval);
        await this.stop();
      }
    }, 1000);
  }
}
