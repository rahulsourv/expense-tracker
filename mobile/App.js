import { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { requestSmsPermissionAsync, startSmsListenerServiceAsync, useSmsListener } from 'expo-sms-listener';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://expense-tracker-chi-topaz.vercel.app';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }) });

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
  return { amount, name: merchantMatch?.[1]?.trim() || 'Bank transaction', isCredit, date: new Date().toISOString().slice(0, 10) };
};

export default function App() {
  const webViewRef = useRef(null);
  const [suggestion, setSuggestion] = useState(null);
  const [status, setStatus] = useState('');

  useSmsListener((sms) => {
    const transaction = parseTransaction(sms.body);
    if (!transaction || transaction.isCredit) return;
    setSuggestion(transaction);
    Notifications.scheduleNotificationAsync({ content: { title: 'NYNET found an expense', body: `₹${transaction.amount.toLocaleString('en-IN')} ${transaction.name}. Open NYNET to review.` }, trigger: null }).catch(() => {});
  });

  const enableSmsDetection = async () => {
    try {
      const permission = await requestSmsPermissionAsync();
      if (!permission.granted) throw new Error('SMS permission was not granted.');
      await Notifications.requestPermissionsAsync();
      await startSmsListenerServiceAsync();
      setStatus('SMS detection enabled');
    } catch (error) { setStatus(error.message || 'Could not enable SMS detection.'); }
  };

  const addExpenseToWebsite = () => {
    if (!suggestion || !webViewRef.current) return;
    const payload = JSON.stringify({ name: suggestion.name, amount: suggestion.amount, category: 'Other', type: 'Flexible', transactionKind: 'expense', date: suggestion.date, paymentMethod: 'Bank', notes: 'Added from transaction SMS' });
    const api = JSON.stringify(API_BASE);
    const script = `(async()=>{try{const t=localStorage.getItem('brutal_auth_token');if(!t){window.ReactNativeWebView.postMessage('LOGIN_REQUIRED');return;}const r=await fetch(${api}+'/expenses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(${payload})});window.ReactNativeWebView.postMessage(r.ok?'EXPENSE_ADDED':'EXPENSE_FAILED');}catch(e){window.ReactNativeWebView.postMessage('EXPENSE_FAILED')}})();true;`;
    webViewRef.current.injectJavaScript(script);
  };

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} source={{ uri: WEB_URL }} style={styles.webview} originWhitelist={['*']} javaScriptEnabled domStorageEnabled onMessage={(event) => { const result = event.nativeEvent.data; if (result === 'EXPENSE_ADDED') { setSuggestion(null); setStatus('Expense added to NYNET'); } else if (result === 'LOGIN_REQUIRED') setStatus('Open NYNET and login first'); else if (result === 'EXPENSE_FAILED') setStatus('Could not add expense'); }} />
      {!suggestion && <Pressable onPress={enableSmsDetection} style={styles.smsButton}><Text style={styles.smsButtonText}>ENABLE SMS DETECTION</Text></Pressable>}
      {!!suggestion && <View style={styles.suggestion}><Text style={styles.title}>TRANSACTION DETECTED</Text><Text style={styles.amount}>₹{suggestion.amount.toLocaleString('en-IN')}</Text><Text style={styles.name}>{suggestion.name}</Text><View style={styles.actions}><Pressable onPress={addExpenseToWebsite} style={styles.add}><Text style={styles.addText}>ADD EXPENSE</Text></Pressable><Pressable onPress={() => setSuggestion(null)} style={styles.ignore}><Text style={styles.ignoreText}>IGNORE</Text></Pressable></View></View>}
      {!!status && <Text style={styles.status}>{status}</Text>}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, webview: { flex: 1 },
  smsButton: { position: 'absolute', right: 14, bottom: 20, backgroundColor: '#f8dc00', borderWidth: 2, borderColor: '#111', paddingHorizontal: 12, paddingVertical: 12, elevation: 6 }, smsButtonText: { color: '#111', fontSize: 10, fontWeight: '900' },
  suggestion: { position: 'absolute', left: 14, right: 14, bottom: 18, backgroundColor: '#f8dc00', borderWidth: 2, borderColor: '#111', padding: 16, elevation: 12 }, title: { color: '#111', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, amount: { color: '#111', fontSize: 28, fontWeight: '900', marginTop: 4 }, name: { color: '#111', fontSize: 15, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, add: { flex: 1, alignItems: 'center', backgroundColor: '#111', padding: 12 }, addText: { color: '#fff', fontWeight: '900', fontSize: 12 }, ignore: { flex: 1, alignItems: 'center', borderWidth: 2, borderColor: '#111', padding: 10 }, ignoreText: { color: '#111', fontWeight: '900', fontSize: 12 }, status: { position: 'absolute', left: 14, right: 14, bottom: 12, backgroundColor: '#111', color: '#fff', padding: 10, textAlign: 'center', fontSize: 12 },
});
