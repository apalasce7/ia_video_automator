import { API_URL } from './utils';

// --- JOBS ---
export const fetchJobs = () => fetch(`${API_URL}/api/jobs`).then(r => r.json());
export const getJob = (id: string) => fetch(`${API_URL}/api/jobs/${id}`).then(r => r.json());
export const approveScene = (id: string) => fetch(`${API_URL}/api/jobs/${id}/scenes/approve`, { method: 'POST' });
export const regenerateScene = (id: string, fd: FormData) => fetch(`${API_URL}/api/jobs/${id}/scenes/regenerate`, { method: 'POST', body: fd });
export const generateNextScene = (id: string) => fetch(`${API_URL}/api/jobs/${id}/scenes/generate_next`, { method: 'POST' });
export const unlockScene = (id: string) => fetch(`${API_URL}/api/jobs/${id}/unlock`, { method: 'POST' });
export const selectVersion = (id: string, idx: number, versionObj: any) => fetch(`${API_URL}/api/jobs/${id}/scenes/${idx}/select_version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(versionObj)
}).then(r => r.json());
export const assembleJob = (id: string) => fetch(`${API_URL}/api/jobs/${id}/assemble`, { method: 'POST' });
export const updateGuide = (id: string, data: any) => fetch(`${API_URL}/api/jobs/${id}/update_guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
}).then(r => r.json());
export const saveEdits = (id: string, edits: any) => fetch(`${API_URL}/api/jobs/${id}/save_edits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edits)
}).then(r => r.json());
export const purgeJob = (id: string) => fetch(`${API_URL}/api/jobs/${id}/purge`, { method: 'POST' });
export const replayJob = (id: string, data: any) => fetch(`${API_URL}/api/jobs/${id}/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const continueJob = (id: string, data: any) => fetch(`${API_URL}/api/jobs/${id}/continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
}).then(r => r.json());
export const approveBaseImage = (id: string) => fetch(`${API_URL}/api/jobs/${id}/approve_base_image`, { method: 'POST' });
export const produce = (fd: FormData) => fetch(`${API_URL}/api/produce`, { method: 'POST', body: fd });

// --- ANALYSIS & PRODUCTS ---
export const analyzeTikTok = (fd: FormData) => fetch(`${API_URL}/api/analyze`, { method: 'POST', body: fd }).then(r => r.json());
export const searchProduct = (url: string) => fetch(`${API_URL}/api/search_product?url=${encodeURIComponent(url)}`, { method: 'POST' }).then(r => r.json());
export const captureFrame = (fd: FormData) => fetch(`${API_URL}/api/capture_frame`, { method: 'POST', body: fd }).then(r => r.json());

// --- INFLUENCERS ---
export const fetchInfluencers = () => fetch(`${API_URL}/api/influencers`).then(r => r.json());
export const createInfluencer = (fd: FormData) => fetch(`${API_URL}/api/influencers/create`, { method: 'POST', body: fd });
export const newVoice = (id: string) => fetch(`${API_URL}/api/influencers/${id}/new_voice`, { method: 'POST' });

// --- UTILS ---
export const checkHealth = () => fetch(`${API_URL}/api/health`).then(r => r.json());
export const fetchCosts = (id: string) => fetch(`${API_URL}/api/costs/${id}`).then(r => r.json());
export const fetchBalance = () => fetch(`${API_URL}/api/balance`).then(r => r.json());
export const translateText = (data: any) => fetch(`${API_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
}).then(r => r.json());
