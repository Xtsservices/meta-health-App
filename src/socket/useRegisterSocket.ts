import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useSocket } from './useSocket';

export const useRegisterSocket = () => {
  const { socket } = useSocket();
  const user = useSelector((s: RootState) => s.currentUser);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const register = () => {
      console.log('🔌 Register socket:', socket.id);
      if (!user?.id) return;

      socket.emit('register-user', {
        userId: user.id,
        message: 'Hello from Driver App',
      });

      //read the response
      socket.on('register-success', data => {
        console.log('🤝 Handshake response:', data);
      });
    };

    // If already connected
    if (socket.connected) {
      register();
    }

    socket.on('connect', register);

    return () => {
      socket.off('connect', register);
    };
  }, [socket, user?.id]);
};
