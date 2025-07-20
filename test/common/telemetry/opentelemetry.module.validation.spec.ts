import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../../src/common/telemetry/opentelemetry.module';
import { OpenTelemetryModuleOptions, OpenTelemetryOptionsFactory } from '../../../src/common/telemetry/interfaces/opentelemetry-options.interface';
import { Injectable } from '@nestjs/common';

// Create a test factory that implements OpenTelemetryOptionsFactory
@Injectable()
class TestOpenTelemetryOptionsFactory implements OpenTelemetryOptionsFactory {
  constructor(private readonly config: OpenTelemetryModuleOptions) {}

  createOpenTelemetryOptions(): OpenTelemetryModuleOptions {
    return this.config;
  }
}

describe('OpenTelemetryModule Validation', () => {
  describe('forRoot validation', () => {
    it('should throw an error when serviceName is not provided', async () => {
      const options: any = {
        environment: 'test',
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('OpenTelemetry service name is required');
    });

    it('should throw an error when Prometheus port is invalid', async () => {
      const options: OpenTelemetryModuleOptions = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: false,
          prometheus: {
            enabled: true,
            port: -1, // Invalid port
            endpoint: '/metrics',
          },
        },
        resourceAttributes: {},
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('Invalid Prometheus port');
    });

    it('should throw an error when Prometheus endpoint does not start with a slash', async () => {
      const options: OpenTelemetryModuleOptions = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: false,
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: 'metrics', // Missing leading slash
          },
        },
        resourceAttributes: {},
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('Invalid Prometheus endpoint');
    });

    it('should throw an error when resource attributes is not an object', async () => {
      const options: any = {
        serviceName: 'test-service',
        resourceAttributes: 'not-an-object', // Invalid resource attributes
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('Resource attributes must be an object');
    });
    
    it('should throw an error when Prometheus port is out of range', async () => {
      const options: OpenTelemetryModuleOptions = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: false,
          prometheus: {
            enabled: true,
            port: 99999, // Port out of range
            endpoint: '/metrics',
          },
        },
        resourceAttributes: {},
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('Invalid Prometheus port');
    });
    
    it('should throw an error when Prometheus endpoint is missing', async () => {
      const options: OpenTelemetryModuleOptions = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: false,
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '', // Missing endpoint
          },
        },
        resourceAttributes: {},
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('Prometheus endpoint is required');
    });
    
    it('should throw an error when custom metrics default attributes is not an object', async () => {
      const options: any = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: false,
          prometheus: {
            enabled: false,
            port: 9464,
            endpoint: '/metrics',
          },
        },
        resourceAttributes: {},
        metrics: {
          customMetrics: {
            defaultAttributes: 'not-an-object', // Invalid default attributes
          },
        },
      };

      await expect(
        Test.createTestingModule({
          imports: [OpenTelemetryModule.forRoot(options)],
        }).compile(),
      ).rejects.toThrow('Custom metrics default attributes must be an object');
    });
  });

  describe('forRootAsync validation', () => {
    it('should throw an error when no configuration method is provided', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            OpenTelemetryModule.forRootAsync({
              imports: [],
              // No useFactory, useClass, or useExisting
            } as any),
          ],
        }).compile(),
      ).rejects.toThrow('Invalid OpenTelemetry module configuration');
    });

    it('should throw an error when factory returns invalid configuration', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            OpenTelemetryModule.forRootAsync({
              useFactory: () => ({
                // Missing serviceName
                environment: 'test',
              } as OpenTelemetryModuleOptions),
            }),
          ],
        }).compile(),
      ).rejects.toThrow('OpenTelemetry service name is required');
    });

    it('should throw an error when useClass returns invalid configuration', async () => {
      // Create a test factory that returns invalid configuration
      const invalidConfig: OpenTelemetryModuleOptions = {
        serviceName: '', // Empty service name
        serviceVersion: '1.0.0',
        enabled: true,
        environment: 'test',
        exporters: {
          console: false,
          prometheus: {
            enabled: false,
            port: 9464,
            endpoint: '/metrics',
          },
        },
        resourceAttributes: {},
      };
      
      await expect(
        Test.createTestingModule({
          imports: [
            OpenTelemetryModule.forRootAsync({
              useClass: TestOpenTelemetryOptionsFactory,
            }),
          ],
          providers: [
            {
              provide: TestOpenTelemetryOptionsFactory,
              useValue: new TestOpenTelemetryOptionsFactory(invalidConfig),
            },
          ],
        }).compile(),
      ).rejects.toThrow('OpenTelemetry service name is required');
    });
    
    it('should throw an error when useExisting returns invalid configuration', async () => {
      // Create a test factory that returns invalid configuration
      const invalidConfig: OpenTelemetryModuleOptions = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: false,
          prometheus: {
            enabled: true,
            port: -1, // Invalid port
            endpoint: '/metrics',
          },
        },
        resourceAttributes: {},
      };
      
      const factory = new TestOpenTelemetryOptionsFactory(invalidConfig);
      
      await expect(
        Test.createTestingModule({
          imports: [
            OpenTelemetryModule.forRootAsync({
              useExisting: TestOpenTelemetryOptionsFactory,
            }),
          ],
          providers: [
            {
              provide: TestOpenTelemetryOptionsFactory,
              useValue: factory,
            },
          ],
        }).compile(),
      ).rejects.toThrow('Invalid Prometheus port');
    });

    it('should throw an error when OpenTelemetryConfigFactory returns invalid configuration', async () => {
      // Mock the loadTelemetryConfig function to return invalid configuration
      jest.mock('../../../src/config/telemetry.config', () => ({
        loadTelemetryConfig: () => ({
          // Missing serviceName
          environment: 'test',
          exporters: {
            console: true,
          },
        }),
        validateTelemetryConfig: jest.requireActual('../../../src/config/telemetry.config').validateTelemetryConfig,
      }));

      // Import the factory after mocking
      const { OpenTelemetryConfigFactory } = require('../../../src/config/opentelemetry-config.factory');

      await expect(
        Test.createTestingModule({
          imports: [
            OpenTelemetryModule.forRootAsync({
              useClass: OpenTelemetryConfigFactory,
            }),
          ],
          providers: [OpenTelemetryConfigFactory],
        }).compile(),
      ).rejects.toThrow('OpenTelemetry service name is required');

      // Restore the original module
      jest.resetModules();
    });
    
    it('should validate configuration from environment variables', async () => {
      // Mock process.env
      const originalEnv = { ...process.env };
      process.env.OTEL_SERVICE_NAME = '';
      
      // Import the factory after mocking
      jest.resetModules();
      const { OpenTelemetryConfigFactory } = require('../../../src/config/opentelemetry-config.factory');
      
      await expect(
        Test.createTestingModule({
          imports: [
            OpenTelemetryModule.forRootAsync({
              useClass: OpenTelemetryConfigFactory,
            }),
          ],
          providers: [OpenTelemetryConfigFactory],
        }).compile(),
      ).rejects.toThrow();
      
      // Restore original env
      process.env = originalEnv;
    });
  });
});