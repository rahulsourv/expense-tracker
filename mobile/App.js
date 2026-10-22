import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      setMessage('LOGIN SUCCESSFUL — dashboard next.');
    } catch (error) {
      setMessage(error.message || 'Unable to connect to backend.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>NYNET</Text>
        <Text style={styles.subtitle}>NOT YOUR NORMAL EXPENSE TRACKER</Text>
        <Text style={styles.heading}>WELCOME BACK</Text>
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#777" style={styles.input} value={email} onChangeText={setEmail} />
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput placeholder="Your password" placeholderTextColor="#777" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
        <Pressable disabled={busy} onPress={login} style={styles.button}>
          <Text style={styles.buttonText}>{busy ? 'CONNECTING...' : 'LOGIN TO NYNET'}</Text>
        </Pressable>
        {!!message && <Text style={styles.message}>{message}</Text>}
        <Text style={styles.endpoint}>API: {API_BASE}</Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101217',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#171a21', borderColor: '#f8dc00', borderWidth: 2, padding: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  brand: { color: '#f8dc00', fontSize: 34, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: '#b8bdc8', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 3 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 36, marginBottom: 22 },
  label: { color: '#f8dc00', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 7 },
  input: { backgroundColor: '#242934', borderColor: '#566071', borderWidth: 1, color: '#fff', padding: 14, fontSize: 16 },
  button: { alignItems: 'center', backgroundColor: '#f8dc00', marginTop: 26, padding: 16 },
  buttonText: { color: '#111', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  message: { color: '#fff', fontSize: 13, marginTop: 16 },
  endpoint: { color: '#737b89', fontSize: 10, marginTop: 24 },
});
