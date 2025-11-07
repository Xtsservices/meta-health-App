

import { View, StyleSheet, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import Routing from './src/navigation/routing';

function App() {
  

  return (
    <View style={styles.container}>
    <Routing/>
    <Toast/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
