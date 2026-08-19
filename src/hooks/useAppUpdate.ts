import { useEffect, useState } from 'react';
import { applyServiceWorkerUpdate, registerServiceWorker } from '../lib/pwa';

/**
 * Registers the service worker and reports when a newer build is parked.
 *
 * Mounted once, in Layout — after sign-in, so a first-time visitor is not
 * caching a shell for an app they may never come back to.
 *
 * The update is offered rather than applied. Taking over swaps the controller
 * and reloads the page, and this app's most expensive moment is a student
 * mid-submission with an unsaved prompt in a textarea. Losing that to a
 * background version bump would be a self-inflicted wound.
 */
export function useAppUpdate(): { updateReady: boolean; applyUpdate: () => void } {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    registerServiceWorker(() => setUpdateReady(true));
  }, []);

  return { updateReady, applyUpdate: applyServiceWorkerUpdate };
}
