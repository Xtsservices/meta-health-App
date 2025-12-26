import { getSocket } from './socket';
import type { Socket } from 'socket.io-client';

export const useSocket = () => {
  return {
    socket: getSocket() as Socket | null,
  };
};
