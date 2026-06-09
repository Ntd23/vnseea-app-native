// Description: Declares the untyped socket.io-client v2 package used by the mobile realtime bridge.
declare module 'socket.io-client' {
  type SocketOptions = {
    path?: string;
    transports?: string[];
    forceNew?: boolean;
    reconnection?: boolean;
    query?: Record<string, string>;
  };

  function io(url: string, options?: SocketOptions): unknown;
  export default io;
}
