export type KeeperMode = "idle" | "live" | "executing" | "alert";

export type LogEntryType = "ok" | "info" | "warn" | "error";

export type LogEntry = {
  id: string;
  type: LogEntryType;
  message: string;
  ts: number;
};

export type BatchOrder = {
  owner: string;
  batch: number;
  index: number;
};

export type DashboardState = {
  currentBatch: number;
  blocksLeft: number;
  orderCount: number;
  lastPrice: string;
  noiseInjected: boolean;
  keeperOnline: boolean;
  batchExecuted: boolean;
  batchStartBlock: number;
  batchSize: number;
  mode: KeeperMode;
  log: LogEntry[];
  orders: BatchOrder[];
};

export const EMPTY_STATE: DashboardState = {
  currentBatch: 0,
  blocksLeft: 0,
  orderCount: 0,
  lastPrice: "0",
  noiseInjected: false,
  keeperOnline: false,
  batchExecuted: false,
  batchStartBlock: 0,
  batchSize: 0,
  mode: "idle",
  log: [],
  orders: [],
};
