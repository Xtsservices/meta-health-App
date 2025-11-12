// App.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import Routing from './src/navigation/routing';
import  store  from './src/store/store'; 
import ToastHost from './src/components/ToastHost';

function App() {
  return (
    <Provider store={store}>
      <View style={styles.container}>
        <SafeAreaProvider>
          <Routing />
          <ToastHost />
        </SafeAreaProvider>
      </View>
    </Provider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
