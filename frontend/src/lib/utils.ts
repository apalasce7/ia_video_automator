import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_URL = "http://localhost:8000";

export function toVideoUrl(path: string): string {
  if (!path) return "";

  // Si ya es una URL completa de otro sitio, la dejamos tal cual
  if (path.startsWith("http") && !path.includes(API_URL)) return path;

  // Si ya tiene un timestamp (?t=), significa que el backend ya gestionó el cache-busting
  if (path.includes("?t=")) {
    if (path.startsWith("http")) return path;
    const normalized = path.replace(/\\/g, "/");
    const idx = normalized.indexOf("downloads/");
    if (idx !== -1) return `${API_URL}/${normalized.substring(idx)}`;
    return `${API_URL}/${normalized}`;
  }

  // Para rutas locales, normalizamos y servimos desde el API_URL
  const normalized = path.replace(/\\/g, "/");
  const lowerPath = normalized.toLowerCase();
  const idx = lowerPath.indexOf("downloads/");

  if (idx !== -1) {
    return `${API_URL}/${normalized.substring(idx)}`;
  }

  // Si no empieza por http ni tiene downloads/, asumimos que es una ruta relativa al servidor
  if (path.startsWith("/")) return `${API_URL}${path}`;
  return `${API_URL}/${path}`;
}

export const NOMINAL_ORDER = [
  '[CAMERA]:', '[CHARACTER]:', '[SCENE & AUDIO]:', '[DIALOGUE]:',
  '[ACTION & TIMELINE]:', '[ACTION]:', '[TECHNICAL RESTRAINTS]:',
];

export const parseSections = (prompt: string): { tag: string; content: string }[] => {
  const raw = prompt.split(/(\[[^\]]+\]:)/g);
  const pairs: { tag: string; content: string }[] = [];
  for (let i = 1; i < raw.length; i += 2) {
    pairs.push({ tag: raw[i], content: (raw[i + 1] || '').trim() });
  }
  // Reordenar: ACTION primero
  return [...pairs].sort((a, b) => {
    const aIsAction = a.tag.toUpperCase().includes('ACTION');
    const bIsAction = b.tag.toUpperCase().includes('ACTION');
    if (aIsAction && !bIsAction) return -1;
    if (!aIsAction && bIsAction) return 1;
    return 0;
  });
};

export const highlightText = (text: string) => {
  if (!text) return text;
  // Note: This needs to return JSX elements, so it's better kept in a component or a .tsx util
  // I will move it to the component for now to avoid React dependency in a pure util file
  return text;
};
