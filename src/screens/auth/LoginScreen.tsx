import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Image, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING } from '../../constants';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      Alert.alert('Connexion échouée', err.message ?? 'Vérifiez vos identifiants.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Yoriin</Text>
          <Text style={styles.subtitle}>Gérez votre business depuis partout</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Connexion</Text>

          <Text style={styles.label}>Nom d'utilisateur</Text>
          <TextInput
            style={styles.input}
            placeholder="votre_identifiant"
            placeholderTextColor={COLORS.textLight}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, styles.passInput]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
              <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>YoriinApp © 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.primary },
  container: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  subtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 6, fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: SPACING.lg, shadowColor: '#000',
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 4 },
  input: {
    backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14,
    fontSize: 15, color: COLORS.text, marginBottom: SPACING.md,
  },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  passInput: { flex: 1, marginRight: 8 },
  eyeBtn: { padding: 10, marginBottom: SPACING.md },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: SPACING.xl, fontSize: 12 },
});
