import request from 'supertest';
import app from '../../src/app';
import { setupTestDb, teardownTestDb, testPrisma } from './helpers';

let token: string;

async function getToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@admin.com', password: 'testpass123' });
  return res.body.data.token as string;
}

describe('Menu API', () => {
  beforeAll(async () => {
    await setupTestDb();
    token = await getToken();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── Categories ─────────────────────────────────────────────────────────────
  describe('Categories', () => {
    let categoryId: string;

    it('POST /api/menu/categories - creates a category', async () => {
      const res = await request(app)
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Food', description: 'Tasty food', sortOrder: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Food');
      categoryId = res.body.data.id as string;
    });

    it('POST /api/menu/categories - rejects duplicate name', async () => {
      const res = await request(app)
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Food' });

      expect(res.status).toBe(409);
    });

    it('POST /api/menu/categories - validates required fields', async () => {
      const res = await request(app)
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('GET /api/menu/categories - lists categories', async () => {
      const res = await request(app)
        .get('/api/menu/categories')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('PATCH /api/menu/categories/:id - updates category', async () => {
      const res = await request(app)
        .patch(`/api/menu/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated description');
    });

    it('GET /api/menu/categories/:id - returns category with items', async () => {
      const res = await request(app)
        .get(`/api/menu/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(categoryId);
    });

    it('GET /api/menu/categories/:id - returns 404 for unknown ID', async () => {
      const res = await request(app)
        .get('/api/menu/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('DELETE /api/menu/categories/:id - deletes empty category', async () => {
      // Create a throwaway category
      const createRes = await request(app)
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Delete Me' });

      const res = await request(app)
        .delete(`/api/menu/categories/${createRes.body.data.id as string}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    // ── Menu Items ────────────────────────────────────────────────────────────
    describe('Menu Items', () => {
      let itemId: string;

      it('POST /api/menu/items - creates a menu item', async () => {
        const res = await request(app)
          .post('/api/menu/items')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Test Burger',
            description: 'A delicious burger',
            price: 45000,
            categoryId,
          });

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Test Burger');
        expect(res.body.data.price).toBe(45000);
        itemId = res.body.data.id as string;
      });

      it('POST /api/menu/items - validates price must be non-negative', async () => {
        const res = await request(app)
          .post('/api/menu/items')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Invalid', price: -100, categoryId });

        expect(res.status).toBe(400);
      });

      it('POST /api/menu/items - validates category exists', async () => {
        const res = await request(app)
          .post('/api/menu/items')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'No Category',
            price: 10000,
            categoryId: '00000000-0000-0000-0000-000000000000',
          });

        expect(res.status).toBe(404);
      });

      it('GET /api/menu/items - lists all items', async () => {
        const res = await request(app)
          .get('/api/menu/items')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('GET /api/menu/public - returns public menu with categories', async () => {
        const res = await request(app).get('/api/menu/public');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('PATCH /api/menu/items/:id - updates item', async () => {
        const res = await request(app)
          .patch(`/api/menu/items/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ price: 50000, isAvailable: false });

        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(50000);
        expect(res.body.data.isAvailable).toBe(false);
      });

      it('DELETE /api/menu/items/:id - deletes item without orders', async () => {
        // Create throwaway item
        const createRes = await request(app)
          .post('/api/menu/items')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Throwaway Item', price: 10000, categoryId });

        const res = await request(app)
          .delete(`/api/menu/items/${createRes.body.data.id as string}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
      });

      it('requires authentication for admin routes', async () => {
        const res = await request(app).get('/api/menu/categories');
        expect(res.status).toBe(401);
      });
    });
  });
});
