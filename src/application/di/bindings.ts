/**
 * Dependency injection bindings
 * Registers all services and their dependencies in the DI container
 */

import { DatabaseErrorFactory } from '../../core/factories/error.factory';
import { LoggerFactory } from '../../core/factories/logger.factory';
import type { ICommandExecutor, IConfigProvider, IRetryStrategy } from '../../core/interfaces';
import { RetryCoordinator } from '../../core/services/connection/retry-coordinator';
import { MongoAdapter } from '../../infrastructure/adapters/mongodb/mongo.adapter';
import { PostgresAdapter } from '../../infrastructure/adapters/postgres/postgres.adapter';
import { MockCommandExecutor } from '../../infrastructure/command/mock-command-executor';
import { NodeCommandExecutor } from '../../infrastructure/command/node-command-executor';
import { ConfigurationLoader } from '../../infrastructure/config/configuration-loader';
import { ConfigurationValidator } from '../../infrastructure/config/configuration-validator';
import { EnvironmentConfigProvider } from '../../infrastructure/config/environment-config-provider';
import { InMemoryConfigProvider } from '../../infrastructure/config/in-memory-config-provider';
import { ExponentialBackoffStrategy } from '../../infrastructure/retry/exponential-backoff.strategy';
import { ExponentialBackoffWithJitterStrategy } from '../../infrastructure/retry/exponential-backoff-with-jitter.strategy';
import { LinearBackoffStrategy } from '../../infrastructure/retry/linear-backoff.strategy';
import type { DIContainer } from './container';
import { DatabaseAdapterRegistry } from './registry';

/**
 * Register all bindings in the DI container
 * @param container DI container to register bindings in
 */
export function registerBindings(container: DIContainer): void {
  // Factories
  container.bindSingleton('LoggerFactory', () => new LoggerFactory());
  container.bindSingleton('DatabaseErrorFactory', () => new DatabaseErrorFactory());

  // Configuration
  container.bindSingleton<IConfigProvider>('IConfigProvider', () => new EnvironmentConfigProvider());
  container.bindSingleton('ConfigurationLoader', () => new ConfigurationLoader(
    container.resolve<IConfigProvider>('IConfigProvider')
  ));
  container.bindSingleton('ConfigurationValidator', () => new ConfigurationValidator());

  // Retry Strategies
  container.bind<IRetryStrategy>('ExponentialBackoffStrategy', () => new ExponentialBackoffStrategy());
  container.bind<IRetryStrategy>('LinearBackoffStrategy', () => new LinearBackoffStrategy());
  container.bind<IRetryStrategy>('ExponentialBackoffWithJitterStrategy', () => new ExponentialBackoffWithJitterStrategy());

  // Default Retry Strategy
  container.bind<IRetryStrategy>('DefaultRetryStrategy', () => new ExponentialBackoffStrategy());
  container.bindSingleton('RetryCoordinator', () => new RetryCoordinator(
    container.resolve<IRetryStrategy>('DefaultRetryStrategy')
  ));

  // Command Executor
  container.bindSingleton<ICommandExecutor>('ICommandExecutor', () => new NodeCommandExecutor());

  // Database Adapters
  container.bind('PostgresAdapter', () => new PostgresAdapter(
    container.resolve<IRetryStrategy>('DefaultRetryStrategy')
  ));
  container.bind('MongoAdapter', () => new MongoAdapter(
    container.resolve<IRetryStrategy>('DefaultRetryStrategy')
  ));

  // Database Adapter Registry
  container.bindSingleton('DatabaseAdapterRegistry', () => {
    const registry = new DatabaseAdapterRegistry();
    registry.register(container.resolve('PostgresAdapter'));
    registry.register(container.resolve('MongoAdapter'));
    return registry;
  });
}

/**
 * Register test bindings (test doubles for dependencies)
 * @param container DI container to register bindings in
 */
export function registerTestBindings(container: DIContainer): void {
  // Configuration (in-memory for testing)
  container.bindSingleton('IConfigProvider', () => new InMemoryConfigProvider({}));
  container.bindSingleton('ConfigurationLoader', () => new ConfigurationLoader(
    container.resolve('IConfigProvider')
  ));

  // Command Executor (mock for testing)
  container.bindSingleton('ICommandExecutor', () => new MockCommandExecutor());

  // Keep other bindings the same
  container.bindSingleton('LoggerFactory', () => new LoggerFactory());
  container.bindSingleton('DatabaseErrorFactory', () => new DatabaseErrorFactory());
  container.bindSingleton('ConfigurationValidator', () => new ConfigurationValidator());
  container.bind<IRetryStrategy>('DefaultRetryStrategy', () => new ExponentialBackoffStrategy());
  container.bindSingleton('RetryCoordinator', () => new RetryCoordinator(
    container.resolve<IRetryStrategy>('DefaultRetryStrategy')
  ));
}
