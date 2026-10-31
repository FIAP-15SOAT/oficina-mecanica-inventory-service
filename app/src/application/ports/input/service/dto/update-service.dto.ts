export interface UpdateServiceDto {
  name: string;
  description?: string | null;
  basePrice: number;
  estimatedTimeMin: number;
}
