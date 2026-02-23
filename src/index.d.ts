export interface BlackfireConfiguration {
  /** Name of the application. Defaults to 'my-node-app'. */
  appName?: string;
  /** Socket to the Blackfire agent. Defaults to platform-specific socket. */
  agentSocket?: string;
  /** Blackfire Server ID (should be defined with serverToken). */
  serverId?: string;
  /** Blackfire Server Token (should be defined with serverId). */
  serverToken?: string;
  /** Labels to add to the profile. */
  labels?: Record<string, string>;
  /** Timeout in milliseconds for the upload request. Defaults to 10000. */
  uploadTimeoutMillis?: number;
}

export function start(config: BlackfireConfiguration): boolean;
export function stop(): boolean;

export const defaultConfig: Required<
  Pick<BlackfireConfiguration, 'appName' | 'agentSocket' | 'uploadTimeoutMillis' | 'labels'>
> &
  Pick<BlackfireConfiguration, 'serverId' | 'serverToken'>;
