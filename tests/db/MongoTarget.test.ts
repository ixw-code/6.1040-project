import { describe, expect, test } from 'bun:test';
import { assertMongoTarget, connectMongo } from '@/db.ts';

describe('MongoDB profile guard', () => {
  test('development permits only the development database', () => {
    expect(() => assertMongoTarget('wikiplotter_dev', 'development')).not.toThrow();
    expect(() => assertMongoTarget('wikiplotter', 'development')).toThrow('Refusing MongoDB');
    expect(() => assertMongoTarget('wikiplotter_test_local', 'development')).toThrow('Refusing MongoDB');
  });

  test('test permits only named test databases', () => {
    expect(() => assertMongoTarget('wikiplotter_test_local', 'test')).not.toThrow();
    expect(() => assertMongoTarget('wikiplotter_test_abc123', 'test')).not.toThrow();
    expect(() => assertMongoTarget('wikiplotter_test_', 'test')).toThrow('Refusing MongoDB');
    expect(() => assertMongoTarget('wikiplotter_dev', 'test')).toThrow('Refusing MongoDB');
  });

  test('production requires an explicit production profile', async () => {
    expect(() => assertMongoTarget('wikiplotter', 'production')).not.toThrow();
    expect(() => assertMongoTarget('wikiplotter_dev', 'production')).toThrow('Refusing MongoDB');
    expect(() => assertMongoTarget('wikiplotter', 'typo')).toThrow('Refusing MongoDB');
    await expect(connectMongo('mongodb://127.0.0.1:1/wikiplotter'))
      .rejects.toThrow('Refusing MongoDB');
  });
});
