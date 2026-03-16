import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Routing from './src/navigation/routing';
import store from './src/store/store';
import ToastHost from './src/components/ToastHost';
import { initSocket } from './src/socket/socket';
import SocketBootstrap from './src/socket/SocketBootstrap';

const App = () => {
  useEffect(() => {
    initSocket(); // ✅ connect once
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        {/* 🔌 Socket lifecycle lives here */}
        <SocketBootstrap />

        <View style={styles.container}>
          <Routing />
          <ToastHost />
        </View>
      </SafeAreaProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default App;
