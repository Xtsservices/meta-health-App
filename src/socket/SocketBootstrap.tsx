// src/socket/SocketBootstrap.tsx
import { useRegisterSocket } from './useRegisterSocket';

const SocketBootstrap = () => {
  console.log('SocketBootstrap rendered');
  useRegisterSocket();
  return null; // no UI
};

export default SocketBootstrap;
