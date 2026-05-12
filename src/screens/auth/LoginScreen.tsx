import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../constants';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
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
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Gradient header */}
      <LinearGradient
        colors={['#25D366', '#128C7E']}
        start={{ x: 0.7, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={s.header}
      >
        <View style={s.logoBox}>
          <Text style={s.logoLetter}>Y</Text>
        </View>
        <Text style={s.logoText}>Yoriin</Text>
        <Text style={s.logoSub}>Point de vente · Sénégal</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.welcome}>Bon retour 👋</Text>
          <Text style={s.welcomeSub}>Connecte-toi pour gérer ta boutique</Text>

          {/* Identifier */}
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>IDENTIFIANT OU EMAIL</Text>
            <View style={s.fieldRow}>
              <Ionicons name="person-outline" size={20} color={C.muted} style={s.fieldIcon} />
              <TextInput
                style={s.input}
                placeholder="votre_identifiant"
                placeholderTextColor={C.muted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>MOT DE PASSE</Text>
            <View style={s.fieldRow}>
              <Ionicons name="card-outline" size={20} color={C.muted} style={s.fieldIcon} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember + Forgot */}
          <View style={s.rememberRow}>
            <TouchableOpacity style={s.checkRow} onPress={() => setRemember(v => !v)}>
              <View style={[s.checkbox, remember && s.checkboxOn]}>
                {remember && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={s.rememberText}>Se souvenir de moi</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={s.forgotText}>Oublié ?</Text>
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[s.btnPrimary, isLoading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.btnPrimaryText}>Se connecter</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          {/* WhatsApp button */}
          <TouchableOpacity style={s.btnWhatsApp} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={22} color={C.primary} />
            <Text style={s.btnWhatsAppText}>Continuer avec WhatsApp</Text>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Nouveau commerçant ? </Text>
            <TouchableOpacity>
              <Text style={s.footerLink}>Créer une boutique</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    overflow: 'hidden',
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoLetter: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1.5 },
  logoText:   { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginTop: 2 },
  logoSub:    { fontSize: 13, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3, fontWeight: '500' },

  form: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36 },
  welcome:    { fontSize: 24, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  welcomeSub: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 24 },

  fieldWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.text2, marginBottom: 7, letterSpacing: 0.4 },
  fieldRow: {
    height: 56, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: C.text, fontFamily: 'System' },
  eyeBtn: { padding: 8 },

  rememberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  rememberText: { fontSize: 14, color: C.text2 },
  forgotText:   { fontSize: 14, color: C.secondary, fontWeight: '600' },

  btnPrimary: {
    height: 56, borderRadius: 16, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted },

  btnWhatsApp: {
    height: 52, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  btnWhatsAppText: { fontSize: 15, fontWeight: '600', color: C.text },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: C.muted },
  footerLink: { fontSize: 13, color: C.secondary, fontWeight: '600' },
});
