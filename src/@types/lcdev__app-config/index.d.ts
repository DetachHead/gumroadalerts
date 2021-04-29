// AUTO GENERATED CODE
// Run app-config with 'generate' command to regenerate this file

import '@app-config/main';

export interface Config {
  debug?: boolean;
  gumroads: Gumroad[];
  webhooks: Webhooks;
}

export interface Gumroad {
  email: string;
  link: string;
  linkid: string;
  name: string;
}

export interface Webhooks {
  errors: string;
  notifs: string;
}

// augment the default export from app-config
declare module '@app-config/main' {
  export interface ExportedConfig extends Config {}
}
