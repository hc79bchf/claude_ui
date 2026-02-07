import { useEffect, useState } from 'react';
import { getAPI, API } from '../lib/api';

let globalApi: API | null = null;
let apiPromise: Promise<API> | null = null;

export function useApi() {
  const [api, setApi] = useState<API | null>(globalApi);

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
