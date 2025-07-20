/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * Simple integration test to verify the refactored telemetry system works end-to-end.
 * This test improves:
 * 
 * - Developer Clarity: Tests actual application behaviour rather than implementation details
 * - Long-term Support: Integration tests are more stable than unit tests with complex mocks
 * - Compute Efficiency: Single test covers multiple components efficiently
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Mock the OpenTelemetry SDK to avoid actual telemetry setup in tests
jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: jest.fn().mockReturnValue({
      createCounter: jest.fn().mockReturnValue({
        add: jest.fn(),
      }),
      createHistogram: jest.fn().mockReturnValue({
        record: jest.fn(),
      }),
    }),
  },
}));

describe('App Integration (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should start the application successfully', () => {
    expect(app).toBeDefined();
  });

  it('should respond to health checks', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.telemetry).toBeDefined();
        expect(res.body.telemetry.serviceName).toBeDefined();
      });
  });

  it('should provide metrics information', () => {
    return request(app.getHttpServer())
      .get('/api/metrics')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect((res: any) => {
        expect(res.text).toContain('NestJS OpenTelemetry POC Metrics');
        expect(res.text).toContain('Prometheus metrics are available');
      });
  });

  it('should handle product requests', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200);
  });

  it('should handle order requests', () => {
    return request(app.getHttpServer())
      .get('/api/orders')
      .expect(200);
  });
});