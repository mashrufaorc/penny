export type AccountType = "chequing" | "savings";

export type LedgerEntry = {
  id: string;
  ts: number;
  description: string;
  amountCents: number; // +deposit, -withdraw
  account: AccountType;
  category: "income" | "rent" | "food" | "home" | "fun" | "fees" | "transfer" | "other";
};

export type TaskCategory = "rent" | "food" | "home" | "furniture" | "transport" | "fun" | "bill";

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  costCents: number;
  dueAt: number;
  prompt: string;
  hint: string;
  status: "open" | "paid" | "failed";
  createdAt: number;
};

export type MonthSummary = {
  monthIndex: number;
  startedAt: number;
  endedAt: number;
  rentPaid: boolean;
  tasksPaid: number;
  tasksFailed: number;
  netCents: number;
};
