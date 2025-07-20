import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../../src/common/telemetry/opentelemetry.module';
import { OpenTelemetryService } from '../../../src/common/telemetry/opentelemetry.service';
import { OPENTELEMETRY_MODULE_OPTIONS } from '../../../src/common/telemetry/telemetry.constants';
import { OpenTelemetryModuleOptions, OpenTelemetryOptionsFactory } from '../../../src/common/telemetry/interfaces/opentelemetry-options.interface';
import { Injectable } from '@nestjs/common';

// Create a test options factory class
@Injectable()
class TestOpenTelemetryOptionsFactory implements OpenTelemetryOptionsFactory {
  createOpenTelemetryOptions(): OpenTelemetryModuleOptions {
    return {
      serviceName: 'test-service-from-factory',
      environment: 'test',
    };
  }
}

describe('OpenTelemetryModule', () => {
  describe('forRoot', () => {
    it('should provide the OpenTelemetryService', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenTelemetryModule.forRoot({
            serviceName: 'test-service',
            environment: 'test',
          }),
        ],
      }).compile();

      const service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(OpenTelemetryService);
    });

    it('should provide the options with the correct values', async () => {
      const options: OpenTelemetryModuleOptions = {
        serviceName: 'test-service',
        environment: 'test',
        exporters: {
          console: true,
        },
      };

      const moduleRef = await Test.createTestingModule({
        imports: [OpenTelemetryModule.forRoot(options)],
      }).compile();

      const providedOptions = moduleRef.get<OpenTelemetryModuleOptions>(OPENTELEMETRY_MODULE_OPTIONS);
      expect(providedOptions).toEqual(options);
    });
  });

  describe('forRootAsync', () => {
    it('should work with useFactory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenTelemetryModule.forRootAsync({
            useFactory: () => ({
              serviceName: 'test-service-from-factory',
              environment: 'test',
            }),
          }),
        ],
      }).compile();

      const service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      const options = moduleRef.get<OpenTelemetryModuleOptions>(OPENTELEMETRY_MODULE_OPTIONS);

      expect(service).toBeDefined();
      expect(options.serviceName).toBe('test-service-from-factory');
    });

    it('should work with useClass', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenTelemetryModule.forRootAsync({
            useClass: TestOpenTelemetryOptionsFactory,
          }),
        ],
      }).compile();

      const service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      const options = moduleRef.get<OpenTelemetryModuleOptions>(OPENTELEMETRY_MODULE_OPTIONS);

      expect(service).toBeDefined();
      expect(options.serviceName).toBe('test-service-from-factory');
    });

    it('should work with useExisting', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [TestOpenTelemetryOptionsFactory],
        imports: [
          OpenTelemetryModule.forRootAsync({
            useExisting: TestOpenTelemetryOptionsFactory,
          }),
        ],
      }).compile();

      const service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      const options = moduleRef.get<OpenTelemetryModuleOptions>(OPENTELEMETRY_MODULE_OPTIONS);

      expect(service).toBeDefined();
      expect(options.serviceName).toBe('test-service-from-factory');
    });

    it('should inject dependencies into the factory function', async () => {
      const mockDependency = { value: 'test-dependency' };

      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: 'TEST_DEPENDENCY',
            useValue: mockDependency,
          },
        ],
        imports: [
          OpenTelemetryModule.forRootAsync({
            inject: ['TEST_DEPENDENCY'],
            useFactory: (dependency: typeof mockDependency) => ({
              serviceName: `test-service-with-${dependency.value}`,
              environment: 'test',
            }),
          }),
        ],
      }).compile();

      const options = moduleRef.get<OpenTelemetryModuleOptions>(OPENTELEMETRY_MODULE_OPTIONS);
      expect(options.serviceName).toBe('test-service-with-test-dependency');
    });
  });

  describe('forFeature', () => {
    it('should provide the OpenTelemetryService with disabled SDK', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenTelemetryModule.forFeature({
            serviceName: 'test-service',
            environment: 'test',
          }),
        ],
      }).compile();

      const service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      const options = moduleRef.get<OpenTelemetryModuleOptions>(OPENTELEMETRY_MODULE_OPTIONS);

      expect(service).toBeDefined();
      expect(options.enabled).toBe(false);
      expect(options.serviceName).toBe('test-service');
    });
  });
});