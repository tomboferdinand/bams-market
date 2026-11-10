import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  const opts = { name: 'login', limit: 3, windowSeconds: 60 };
  let guard: RateLimitGuard;
  beforeEach(() => {
    guard = new RateLimitGuard({ get: jest.fn() } as any);
  });

  it('laisse passer jusqu’à la limite puis refuse avec 429', () => {
    const t = 1_000_000;
    expect(guard.check('login:1.1.1.1', opts, t)).toBe(true);
    expect(guard.check('login:1.1.1.1', opts, t + 1)).toBe(true);
    expect(guard.check('login:1.1.1.1', opts, t + 2)).toBe(true);
    try {
      guard.check('login:1.1.1.1', opts, t + 3);
      throw new Error('aurait dû refuser');
    } catch (e: any) {
      expect(e.getStatus()).toBe(429);
      expect(e.message).toMatch(/Trop de tentatives/);
    }
  });

  it('compte séparément chaque adresse IP', () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) guard.check('login:1.1.1.1', opts, t + i);
    expect(guard.check('login:2.2.2.2', opts, t + 5)).toBe(true);
  });

  it('autorise de nouveau une fois la fenêtre écoulée', () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) guard.check('login:1.1.1.1', opts, t + i);
    expect(guard.check('login:1.1.1.1', opts, t + 61_000)).toBe(true);
  });
});
