export interface SpendingHeatmapMetadata {
  currency: string;
  start: string;
  end: string;
}

export interface SpendingHeatmapDay {
  date: string;
  totalSpend: number;
  currency: string;
}

export interface SpendingHeatmapResponse {
  metadata: SpendingHeatmapMetadata;
  data: SpendingHeatmapDay[];
}
