import { useEffect, useState } from 'react';
import { getAPI, ElectronAPI } from '../lib/electron';

let globalApi: ElectronAPI | null = null;
let apiPromise: Promise<ElectronAPI> | null = null;

export function useApi() {
  const [api, setApi] = useState<ElectronAPI | null>(globalApi);

  useEffect(() => {
    if (globalApi) {
      setApi(globalApi);
      return;
    }

    if (!apiPromise) {
      apiPromise = getAPI();
    }

    apiPromise.then((resolvedApi) => {
      globalApi = resolvedApi;
      setApi(resolvedApi);
    });
  }, []);

  return api;
}
