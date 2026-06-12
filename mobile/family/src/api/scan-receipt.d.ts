export type ScanLineItem = { name: string; qty?: number; price?: number };

export type ScanResult = {
  scan_id: string;
  merchant: string;
  total: number;
  date: string;
  category: string;
  note?: string;
  line_items?: ScanLineItem[];
};

export declare function scanReceipt(input: {
  family_id: string;
  imageDataUrl: string;
}): Promise<{ ok: true; result: ScanResult } | { ok: false; error: string }>;
