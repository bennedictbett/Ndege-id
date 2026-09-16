import NetInfo from '@react-native-community/netinfo';

/**
 * One-shot connectivity check. isInternetReachable can be null while
 * NetInfo is still determining state (common right after app launch);
 * treated as "assume reachable" rather than blocking on an unknown.
 */
export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!state.isConnected && state.isInternetReachable !== false;
}