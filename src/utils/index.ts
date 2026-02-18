import { format, parseISO, differenceInDays, ja } from './date-imports';

export function formatDate(dateStr: string, fmt?: string): string {
  try {
    return format(parseISO(dateStr), fmt || 'M月d日(E)', { locale: ja });
  } catch {
    return dateStr;
  }
}

export function daysSince(dateStr: string): number {
  try {
    return differenceInDays(new Date(), parseISO(dateStr));
  } catch {
    return 0;
  }
}

export function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function parsePhotoIds(idsStr: string): string[] {
  if (!idsStr) return [];
  return idsStr.split(',').map((s) => s.trim()).filter(Boolean);
}

export function joinPhotoIds(ids: string[]): string {
  return ids.join(',');
}
