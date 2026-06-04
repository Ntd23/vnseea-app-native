// Description: Mounts foreground incoming LiveKit call polling for the Messages context.
import { useIncomingLiveKitCalls } from '../../application/view-models/useIncomingLiveKitCalls';

function IncomingCallWatcher() {
  useIncomingLiveKitCalls();
  return null;
}

export default IncomingCallWatcher;
