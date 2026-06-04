export type ScanLineItem = { name: string; qty?: number; price?: number };

export type ScanResult = {
  scan_id: string;
  merchant: string;
  total: number;
  date: string;
  category: "Ăn uống" | "Nhà cửa" | "Con cái" | "Sức khỏe" | "Giải trí" | "Khác";
  note?: string;
  line_items?: ScanLineItem[];
};

export declare function scanReceipt(input: {
  family_id: string;
  imageDataUrl: string;
}): Promise<{ ok: true; result: ScanResult } | { ok: false; error: string }>;
