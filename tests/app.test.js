const request = require('supertest');
const app = require('../src/app');

describe('DevOps Node.js Application', () => {
  
  describe('GET /', () => {
    it('should return welcome message', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.status).toBe('running');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const res = await request(app).get('/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });

  describe('GET /api/info', () => {
    it('should return application info', async () => {
      const res = await request(app).get('/api/info');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('nodeVersion');
    });
  });

  describe('POST /api/echo', () => {
    it('should echo back the request body', async () => {
      const testData = { test: 'data', value: 123 };
      const res = await request(app)
        .post('/api/echo')
        .send(testData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.receivedData).toEqual(testData);
    });
  });

  describe('GET /api/add/:a/:b', () => {
    it('should add two numbers correctly', async () => {
      const res = await request(app).get('/api/add/5/3');
      expect(res.statusCode).toBe(200);
      expect(res.body.result).toBe(8);
      expect(res.body.operation).toBe('addition');
    });

    it('should handle decimal numbers', async () => {
      const res = await request(app).get('/api/add/5.5/3.2');
      expect(res.statusCode).toBe(200);
      expect(res.body.result).toBeCloseTo(8.7, 1);
    });

    it('should return error for invalid numbers', async () => {
      const res = await request(app).get('/api/add/abc/123');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
