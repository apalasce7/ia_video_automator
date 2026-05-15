export interface Job {
  id: string;
  status: string;
  created_at: string;
  data: any;
}

export interface Scene {
  id: number;
  duracion: number;
  audio_mode: string;
  script_completo?: string;
  script?: string;
  locucion?: string;
  prompt_visual_ingles?: string;
  prompt_visual?: string;
  video_url?: string;
  scene_results?: string[];
  scene_results_v2?: any[];
  selected_version_idx?: number;
}

export interface ClipEdits {
  start: number;
  end: number;
  excluded: boolean;
}

export interface InspectedResult {
  label: string;
  value: any;
  payload?: any;
  jobId?: string;
  isEditable?: boolean;
  keyName?: string;
}

export type ProjectMode = 'ugc' | 'clonar' | 'libre';

export interface Influencer {
  id: string;
  name: string;
  local_path: string;
  sheet_path: string | null;
  element_id: string;
  seed: number;
  voice_print: string;
  age?: string;
  gender?: 'female' | 'male' | 'non-binary';
  tone?: string;
  timbre?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: any; // usar any o React.ComponentType para los iconos de lucide
  children?: NavItem[];
}

export interface BackendStatus {
  status: string;
  wavespeed_api: string;
  minimax_api: string;
  active_jobs: number;
}
