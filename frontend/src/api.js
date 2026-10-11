import axios from 'axios';

// The API base URL defaults to /api when hosted through the unified Node/FastAPI server
const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Fallback in-memory state for initial demo experience
const LOCAL_STORAGE_KEY = 'loanlens_applications_cache';

export const api = {
  // System Health
  async getHealth() {
    try {
      const res = await apiClient.get('/health');
      return res.data;
    } catch (err) {
      console.warn('Backend /health unreachable, using fallback state:', err.message);
      return {
        status: 'healthy',
        backend_mode: 'mock',
        model_status: 'Cloud Preview Mode Active',
        explainer_status: 'SHAP TreeExplainer Simulator Active',
        thresholds: {
          approve: '< 15%',
          review: '15% - 30%',
          reject: '> 30%'
        }
      };
    }
  },

  // Predict
  async predict(applicationData) {
    try {
      const res = await apiClient.post('/predict', applicationData);
      return res.data;
    } catch (err) {
      console.error('Error in /predict:', err);
      throw err;
    }
  },

  // Explain SHAP
  async explain(applicationData) {
    try {
      const res = await apiClient.post('/explain', applicationData);
      return res.data;
    } catch (err) {
      console.error('Error in /explain:', err);
      throw err;
    }
  },

  // What-If
  async whatIf(originalApplication, modifiedFeatures) {
    try {
      const res = await apiClient.post('/what-if', {
        original_application: originalApplication,
        modified_features: modifiedFeatures,
      });
      return res.data;
    } catch (err) {
      console.error('Error in /what-if:', err);
      throw err;
    }
  },

  // Get Applications Audit
  async getApplications(search = '', decision = 'ALL', limit = 50, offset = 0) {
    try {
      const res = await apiClient.get('/applications', {
        params: { search, decision, limit, offset },
      });
      return res.data;
    } catch (err) {
      console.error('Error in /applications:', err);
      return { total: 0, applications: [] };
    }
  },

  // Get Single Application
  async getApplication(id) {
    try {
      const res = await apiClient.get(`/applications/${id}`);
      return res.data;
    } catch (err) {
      console.error(`Error in /applications/${id}:`, err);
      throw err;
    }
  },

  // Update Application in Database Store
  async updateApplication(id, updateData) {
    try {
      const res = await apiClient.put(`/applications/${id}`, updateData);
      return res.data;
    } catch (err) {
      console.error(`Error updating application /applications/${id}:`, err);
      throw err;
    }
  },

  // Portfolio Insights
  async getInsights() {
    try {
      const res = await apiClient.get('/insights');
      return res.data;
    } catch (err) {
      console.error('Error in /insights:', err);
      throw err;
    }
  },

  // System Configuration & AI Models
  async getConfig() {
    try {
      const res = await apiClient.get('/config');
      return res.data;
    } catch {
      return {
        has_groq_key: false,
        default_model: 'qwen/qwen3.8-27b',
        supported_models: [
          { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', tag: 'Fast Reasoning · Analytical' },
          { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', tag: 'High Capacity · Policy Reasoning' },
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Groq Versatile' }
        ]
      };
    }
  },

  // AI Copilot Agent Studio
  async queryAgent(query, applicationData = null, applicationId = null, model = 'qwen/qwen3.8-27b', apiKey = null) {
    try {
      const headers = {};
      if (apiKey) {
        headers['x-groq-api-key'] = apiKey;
      }
      const res = await apiClient.post('/agent', {
        query,
        application_data: applicationData,
        application_id: applicationId,
        model,
      }, { headers });
      return res.data;
    } catch (err) {
      console.error('Error in /agent:', err);
      return {
        reply: "The Autonomous Agent is currently evaluating with local safety parameters. The active policy thresholds are: <15% Approve, 15-30% Review, >30% Reject.",
        tool_calls: [],
        tool_type: 'analysis'
      };
    }
  }
};
