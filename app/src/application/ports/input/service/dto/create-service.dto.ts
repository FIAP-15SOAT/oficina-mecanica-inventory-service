export interface CreateServiceDto {
  name: string;
  description?: string | null;
  basePrice: number;
  estimatedTimeMin: number;
}
