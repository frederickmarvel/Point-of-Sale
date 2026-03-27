import request from 'supertest';
import app from '../../src/app';
import { setupTestDb, teardownTestDb, testPrisma } from './helpers';

describe('Auth API', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('POST /api/auth/login', () => {
    it('returns token on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@admin.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.admin.email).toBe('test@admin.com');
    });

    it('returns 401 on invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@admin.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 on unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notexist@admin.com', password: 'any' });

      expect(res.status).toBe(401);
    });

    it('validates email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'pass' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('requires password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@admin.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/profile', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@admin.com', password: 'testpass123' });
      token = res.body.data.token as string;
    });

    it('returns profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@admin.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });
});
