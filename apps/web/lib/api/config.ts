import { env } from '../env';

export function getApiUrl(): string {
  return env.API_URL.replace(/\/$/, '');
}
