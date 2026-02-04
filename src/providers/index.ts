import { DeAnzaProvider } from '@/src/providers/fhda/deanza';
import { FoothillProvider } from '@/src/providers/fhda/foothill';
import { DvcProvider } from '@/src/providers/dvc';
import { SmcProvider } from '@/src/providers/smc';
import { IvcProvider } from '@/src/providers/ivc';
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
