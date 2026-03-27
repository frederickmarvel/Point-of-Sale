import { successResponse, errorResponse } from '../../src/utils/response.util';

describe('response.util', () => {
  describe('successResponse', () => {
    it('returns success=true with message and data', () => {
      const res = successResponse('OK', { foo: 'bar' });
      expect(res.success).toBe(true);
      expect(res.message).toBe('OK');
      expect(res.data).toEqual({ foo: 'bar' });
    });

    it('returns success=true without data', () => {
      const res = successResponse('OK');
      expect(res.success).toBe(true);
      expect(res.data).toBeUndefined();
    });

    it('includes pagination when provided', () => {
      const pagination = { page: 1, limit: 10, total: 50, totalPages: 5 };
      const res = successResponse('OK', [], pagination);
      expect(res.pagination).toEqual(pagination);
    });
  });

  describe('errorResponse', () => {
    it('returns success=false with message', () => {
      const res = errorResponse('Bad request');
      expect(res.success).toBe(false);
      expect(res.message).toBe('Bad request');
    });

    it('includes errors array when provided', () => {
      const res = errorResponse('Validation failed', ['Field required', 'Invalid email']);
      expect(res.errors).toEqual(['Field required', 'Invalid email']);
    });
  });
});
