export interface CreateServiceRequest {
  name: string;
  description?: string | null;
  basePrice: number;
  estimatedTimeMin: number;
}
