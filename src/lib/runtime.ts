export function appEnvironment(): string {
  return process.env.APP_ENV || 'local';
}

export function isProductionApp(): boolean {
  return appEnvironment() === 'production';
}

export function isRealAiProviderMode(): boolean {
  return process.env.AI_PROVIDER_MODE === 'real';
}
