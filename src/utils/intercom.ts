import Intercom from '@intercom/messenger-js-sdk';

let intercomInitialized = false;

export function initIntercom() {
  if (intercomInitialized) return;
  
  Intercom({
    app_id: 'ijvmhny1',
  });
  
  intercomInitialized = true;
}

export function shutdownIntercom() {
  if (window.Intercom) {
    window.Intercom('shutdown');
    intercomInitialized = false;
  }
}
