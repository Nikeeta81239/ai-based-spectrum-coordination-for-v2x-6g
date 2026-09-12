import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  getHealth: () => client.get('/api/health'),

  // Simulation
  getSimulationStatus: () => client.get('/api/simulation/status'),
  startSimulation: (data) => client.post('/api/simulation/start', data),
  pauseSimulation: () => client.post('/api/simulation/pause'),
  resumeSimulation: () => client.post('/api/simulation/resume'),
  setSimulationSpeed: (multiplier) => client.post(`/api/simulation/speed?multiplier=${multiplier}`),
  stopSimulation: () => client.post('/api/simulation/stop'),
  resetSimulation: () => client.post('/api/simulation/reset'),
  getCurrentSimulation: () => client.get('/api/simulation/current'),
  stepSimulation: () => client.post('/api/simulation/step'),

  // Vehicles
  getVehicles: () => client.get('/api/vehicles'),
  getVehicleById: (id) => client.get(`/api/vehicles/${id}`),

  // Spectrum
  getSpectrumStatus: () => client.get('/api/spectrum'),
  getChannels: () => client.get('/api/spectrum/channels'),

  // AI Model
  getAIStatus: () => client.get('/api/ai/status'),
  trainModel: (params) => client.post('/api/ai/train', params),
  stopAI: () => client.post('/api/ai/stop'),
  evaluateModel: (scenario) => client.post(`/api/ai/evaluate?scenario=${scenario}`),
  getAttention: () => client.get('/api/ai/attention'),
  getCheckpoints: () => client.get('/api/ai/checkpoints'),
  loadCheckpoint: (id) => client.post(`/api/ai/checkpoints/load?checkpoint_id=${id}`),

  // Explainability
  getExplanation: (vehicleId) => client.get(`/api/explainability/${vehicleId}`),
  getAllExplanations: () => client.get('/api/explainability'),
  getGeminiAssistant: (data) => client.post('/api/explainability/assistant', data),
  askGeminiDecision: (data) => client.post('/api/explainability/ask', data),

  // Scenarios / Benchmark
  getScenarios: () => client.get('/api/scenarios'),
  runScenario: (data) => client.post('/api/scenarios/run', data),
  getScenarioResults: (scenario) => client.get(`/api/scenarios/${scenario}/results`),
  getBenchmarkStatus: (scenario) => client.get(`/api/scenarios/${scenario}/benchmark-status`),
  getGeminiFindings: (data) => client.post('/api/scenarios/findings', data),

  // Metrics
  getMetrics: () => client.get('/api/metrics'),
  getPrivacyMetrics: () => client.get('/api/metrics/privacy'),
  getMetricsComparison: (scenario = 'low') => client.get(`/api/metrics/comparison?scenario=${scenario}`),
  getTrainingMetrics: () => client.get('/api/metrics/training'),
};

export default api;
