import { DeAnzaProvider } from '@/src/providers/adapters/deanza';
import { FoothillProvider } from '@/src/providers/adapters/foothill';
import { DvcProvider } from '@/src/providers/adapters/dvc';
import { SmcProvider } from '@/src/providers/adapters/smc';
import { IvcProvider } from '@/src/providers/adapters/ivc';
import type { AvailabilityProvider } from '@/src/providers/types';

const providers: Record<string, AvailabilityProvider> = {
  deanza: new DeAnzaProvider(),
  foothill: new FoothillProvider(),
  dvc: new DvcProvider(),
  smc: new SmcProvider(),
  ivc: new IvcProvider()
};

export function getProvider(adapterKey: string): AvailabilityProvider {
  const provider = providers[adapterKey];
  if (!provider) {
    throw new Error(`Unknown provider adapter: ${adapterKey}`);
  }
  return provider;
}
