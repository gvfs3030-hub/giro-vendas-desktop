import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from '../src/platform/router';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Página não encontrada</Text>
      <Pressable style={styles.btn} onPress={() => router.replace('/')}>
        <Text style={styles.btnText}>Voltar ao início</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  btn: { backgroundColor: '#00C853', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
