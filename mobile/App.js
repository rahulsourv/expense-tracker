import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { requestSmsPermissionAsync, startSmsListenerServiceAsync, useSmsListener } from 'expo-sms-listener';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const parseTransaction = (body) => {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  if (!/(debited|debit|spent|paid|withdrawn|credited|credit|received|upi|imps|neft|card)/i.test(text)) return null;
  if (/(otp|one time password|verification code)/i.test(text) && !/(debited|debit|spent|paid|withdrawn|credited|credit|received)/i.test(text)) return null;
  const amountMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) || text.match(/(?:amount|amt)\s*(?:is|:)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const isCredit = /(credited|credit|received|cashback|refund)/i.test(text) && !/(debited|debit|spent|paid|withdrawn)/i.test(text);
  const merchantMatch = text.match(/(?:at|to|from|on)\s+([A-Za-z][A-Za-z0-9 &.'-]{2,40}?)(?:\s+(?:on|via|using|for)\b|[.,]|$)/i);
  return { amount, name: merchantMatch?.[1]?.trim() || (isCredit ? 'Bank credit' : 'Bank transaction'), isCredit, date: new Date().toISOString().slice(0, 10) };
};

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  useSmsListener((sms) => {
    const transaction = parseTransaction(sms.body);
    if (!transaction || transaction.isCredit) return;
    setSuggestion(transaction);
    Notifications.scheduleNotificationAsync({
      content: { title: 'NYNET found an expense', body: `₹${transaction.amount.toLocaleString('en-IN')} ${transaction.name}. Add it?`, data: { transaction } },
      trigger: null,
    }).catch(() => {});
  });

  useEffect(() => () => Notifications.dismissAllNotificationsAsync().catch(() => {}), []);

  const login = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      setToken(data.token || '');
      setMessage('LOGIN SUCCESSFUL — dashboard next.');
    } catch (error) { setMessage(error.message || 'Unable to connect to backend.'); }
    finally { setBusy(false); }
  };

  const enableSmsDetection = async () => {
    try {
      const smsPermission = await requestSmsPermissionAsync();
      if (!smsPermission.granted) throw new Error('SMS permission was not granted.');
      await Notifications.requestPermissionsAsync();
      await startSmsListenerServiceAsync();
      setSmsEnabled(true);
      setMessage('SMS detection is ON. NYNET will ask before adding expenses.');
    } catch (error) { setMessage(error.message || 'Could not enable SMS detection.'); }
  };

  const addSuggestedExpense = async () => {
    if (!suggestion || !token) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: suggestion.name, amount: suggestion.amount, category: 'Other', type: 'Flexible', transactionKind: 'expense', date: suggestion.date, paymentMethod: 'Bank', notes: 'Added from transaction SMS' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Expense could not be saved.');
      setSuggestion(null); setMessage('Expense added from SMS.');
    } catch (error) { setMessage(error.message || 'Expense could not be saved.'); }
    finally { setBusy(false); }
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
        <Pressable disabled={busy} onPress={login} style={styles.button}><Text style={styles.buttonText}>{busy ? 'CONNECTING...' : 'LOGIN TO NYNET'}</Text></Pressable>
        {!!token && <Pressable onPress={enableSmsDetection} style={[styles.button, styles.secondaryButton]}><Text style={styles.secondaryButtonText}>{smsEnabled ? 'SMS DETECTION ENABLED' : 'ENABLE SMS EXPENSE DETECTION'}</Text></Pressable>}
        {!!message && <Text style={styles.message}>{message}</Text>}
        <Text style={styles.endpoint}>API: {API_BASE}</Text>
      </View>
      {!!suggestion && <View style={styles.suggestion}><Text style={styles.suggestionTitle}>TRANSACTION DETECTED</Text><Text style={styles.suggestionText}>₹{suggestion.amount.toLocaleString('en-IN')} · {suggestion.name}</Text><View style={styles.actions}><Pressable onPress={addSuggestedExpense} style={styles.addButton}><Text style={styles.buttonText}>ADD EXPENSE</Text></Pressable><Pressable onPress={() => setSuggestion(null)} style={styles.ignoreButton}><Text style={styles.ignoreText}>IGNORE</Text></Pressable></View></View>}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101217', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#171a21', borderColor: '#f8dc00', borderWidth: 2, padding: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  brand: { color: '#f8dc00', fontSize: 34, fontWeight: '900', letterSpacing: 2 }, subtitle: { color: '#b8bdc8', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 3 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 36, marginBottom: 22 }, label: { color: '#f8dc00', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 7 },
  input: { backgroundColor: '#242934', borderColor: '#566071', borderWidth: 1, color: '#fff', padding: 14, fontSize: 16 }, button: { alignItems: 'center', backgroundColor: '#f8dc00', marginTop: 26, padding: 16 }, buttonText: { color: '#111', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  secondaryButton: { backgroundColor: '#293140', marginTop: 12 }, secondaryButtonText: { color: '#f8dc00', fontSize: 12, fontWeight: '900', letterSpacing: 0.3 }, message: { color: '#fff', fontSize: 13, marginTop: 16 }, endpoint: { color: '#737b89', fontSize: 10, marginTop: 24 },
  suggestion: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: '#f8dc00', borderColor: '#000', borderWidth: 2, padding: 16, elevation: 12 }, suggestionTitle: { color: '#111', fontSize: 12, fontWeight: '900', letterSpacing: 1 }, suggestionText: { color: '#111', fontSize: 18, fontWeight: '900', marginTop: 7 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, addButton: { backgroundColor: '#111', padding: 12, flex: 1, alignItems: 'center' }, ignoreButton: { borderColor: '#111', borderWidth: 2, padding: 10, flex: 1, alignItems: 'center' }, ignoreText: { color: '#111', fontWeight: '900' },
});
