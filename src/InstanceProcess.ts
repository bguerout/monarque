export type InstanceProcess = {
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
};
