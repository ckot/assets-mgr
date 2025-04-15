// Re-export models from media-db
import type {Pin} from '@assets-mgr/media-db';
export type { Pin, Board } from '@assets-mgr/media-db';

// You can add additional models specific to the processor here
export interface ProcessingResult {
  pin: Pin;
  success: boolean;
  message?: string;
  processingTime: number;
}
