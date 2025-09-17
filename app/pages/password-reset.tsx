import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native'

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"

export default function PasswordResetPage() {
  const { colors } = useTheme()
  const router = useRouter()
  
  // State management
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  
  // Error states
  const [emailError, setEmailError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  // Recovery tokens for password update
  const [recoveryTokens, setRecoveryTokens] = useState<{
    access_token: string
    refresh_token: string
  } | null>(null)

  // Handle deep linking for password reset
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("Password reset deep link received:", url)
      
      if (url.includes('access_token=') && url.includes('type=recovery')) {
        try {
          let accessToken: string | undefined
          let refreshToken: string | undefined
          
          if (url.includes('#')) {
            const hashPart = url.split('#')[1]
            accessToken = hashPart.split('access_token=')[1]?.split('&')[0]
            refreshToken = hashPart.split('refresh_token=')[1]?.split('&')[0]
          } else {
            const urlObj = new URL(url)
            accessToken = urlObj.searchParams.get('access_token') || undefined
            refreshToken = urlObj.searchParams.get('refresh_token') || undefined
          }
          
          if (accessToken) {
            setRecoveryTokens({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            setStep('newPassword')
          }
        } catch (error) {
          console.log("Error processing recovery link:", error)
          Alert.alert("Erreur", "Lien de réinitialisation invalide")
        }
      }
    }

    // Check if app was opened from deep link
    const checkInitialUrl = async () => {
      try {
        const Linking = await import('expo-linking')
        const url = await Linking.getInitialURL()
        if (url) {
          handleDeepLink(url)
        }
      } catch (error) {
        console.log("Error checking initial URL:", error)
      }
    }

    checkInitialUrl()
  }, [])

  // Send password reset OTP (simple approach)
  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      setEmailError("Veuillez entrer votre email")
      return
    }

    setIsLoading(true)
    setEmailError('')

    try {
      console.log("Sending password reset email to:", email)
      
      // Use Supabase's password reset function
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'zooj://reset-password'
      })
      
      if (error) {
        console.log("Password reset error:", error)
        setEmailError(error.message || "Erreur lors de l'envoi de l'email")
        return
      }
      
      Alert.alert(
        "Email envoyé",
        "Un email de réinitialisation a été envoyé à votre adresse email. Vérifiez votre boîte de réception.",
        [
          {
            text: "OK",
            onPress: () => {
              // Move to OTP step
              setStep('otp')
            }
          }
        ]
      )
    } catch (error) {
      console.log("OTP send exception:", error)
      setEmailError("Une erreur inattendue s'est produite")
    } finally {
      setIsLoading(false)
    }
  }

  // Verify OTP code (simple validation - no auto-login)
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError("Veuillez entrer le code OTP")
      return
    }

    setIsVerifyingOtp(true)
    setOtpError('')

    try {
      // Simple OTP validation - just check if it's a valid 6-digit code
      // In production, you'd verify against a stored OTP in your database
      const enteredCode = otpCode.trim()
      
      if (enteredCode.length === 6 && /^\d{6}$/.test(enteredCode)) {
        console.log("OTP verified successfully (simple validation)")
        // Move to password step without signing in
        setStep('newPassword')
      } else {
        setOtpError("Code OTP invalide. Veuillez entrer un code à 6 chiffres.")
      }
    } catch (error) {
      console.log("OTP verification exception:", error)
      setOtpError("Une erreur inattendue s'est produite")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Update password using Supabase
  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setPasswordError("Veuillez entrer un nouveau mot de passe")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas")
      return
    }

    setIsUpdatingPassword(true)
    setPasswordError('')

    try {
      console.log("Updating password for email:", email)
      
      // First, verify the OTP to get a session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: 'recovery'
      })

      if (verifyError) {
        console.log("OTP verification error:", verifyError)
        setPasswordError("Code OTP invalide ou expiré")
        return
      }

      if (!verifyData.session) {
        console.log("No session from OTP verification")
        setPasswordError("Session de récupération invalide")
        return
      }

      console.log("OTP verified, updating password...")
      
      // Now update the password using the session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.log("Password update error:", updateError)
        setPasswordError(updateError.message || "Erreur lors de la mise à jour du mot de passe")
        return
      }

      console.log("Password updated successfully")
      
      // Clear password fields
      setNewPassword("")
      setConfirmPassword("")
      
      // Show success and redirect to login
      Alert.alert(
        "Succès",
        "Votre mot de passe a été mis à jour avec succès!",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to login
              router.replace('/')
            }
          }
        ]
      )
    } catch (error) {
      console.log("Password update exception:", error)
      setPasswordError("Une erreur inattendue s'est produite")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Render email step
  const renderEmailStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <MaterialCommunityIcons name="lock-reset" size={40} color={BRAND_BLUE} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
          Mot de passe oublié?
        </Text>
         <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
           Entrez votre adresse email et nous vous enverrons un code de vérification pour réinitialiser votre mot de passe.
         </Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: colors.surface, borderColor: emailError ? "#FF5A5F" : colors.border, borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Votre adresse email"
            value={email}
            onChangeText={(text) => { setEmail(text); setEmailError('') }}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ paddingHorizontal: 14, height: 50, color: colors.text }}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {emailError ? <Text style={{ color: "#FF5A5F", fontSize: 14 }}>{emailError}</Text> : null}

        <Pressable
          onPress={handleSendResetEmail}
          disabled={isLoading}
          style={{ borderRadius: 12, overflow: "hidden", opacity: isLoading ? 0.7 : 1 }}
        >
          <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
               <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                 Envoyer le code de vérification
               </Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: BRAND_BLUE, fontSize: 16, fontWeight: "500" }}>
            Retour à la connexion
          </Text>
        </Pressable>
      </View>
    </View>
  )

  // Render OTP step
  const renderOtpStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <MaterialCommunityIcons name="message-text" size={40} color={BRAND_BLUE} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
          Code de vérification
        </Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          Entrez le code de vérification envoyé à votre email.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: colors.surface, borderColor: otpError ? "#FF5A5F" : colors.border, borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Code de vérification"
            value={otpCode}
            onChangeText={(text) => { setOtpCode(text); setOtpError('') }}
            keyboardType="numeric"
            style={{ paddingHorizontal: 14, height: 50, color: colors.text, textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
            placeholderTextColor={colors.textSecondary}
            maxLength={6}
          />
        </View>

        {otpError ? <Text style={{ color: "#FF5A5F", fontSize: 14 }}>{otpError}</Text> : null}

        <Pressable
          onPress={handleVerifyOtp}
          disabled={isVerifyingOtp}
          style={{ borderRadius: 12, overflow: "hidden", opacity: isVerifyingOtp ? 0.7 : 1 }}
        >
          <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
            {isVerifyingOtp ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                Vérifier le code
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <Pressable onPress={() => setStep('email')}>
          <Text style={{ color: BRAND_BLUE, fontSize: 16, fontWeight: "500" }}>
            Retour
          </Text>
        </Pressable>
      </View>
    </View>
  )

  // Render new password step
  const renderNewPasswordStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <MaterialCommunityIcons name="key" size={40} color={BRAND_BLUE} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
          Nouveau mot de passe
        </Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          Entrez votre nouveau mot de passe.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: colors.surface, borderColor: passwordError ? "#FF5A5F" : colors.border, borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChangeText={(text) => { setNewPassword(text); setPasswordError('') }}
            secureTextEntry
            style={{ paddingHorizontal: 14, height: 50, color: colors.text }}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: passwordError ? "#FF5A5F" : colors.border, borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); setPasswordError('') }}
            secureTextEntry
            style={{ paddingHorizontal: 14, height: 50, color: colors.text }}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {passwordError ? <Text style={{ color: "#FF5A5F", fontSize: 14 }}>{passwordError}</Text> : null}

        <Pressable
          onPress={handleUpdatePassword}
          disabled={isUpdatingPassword}
          style={{ borderRadius: 12, overflow: "hidden", opacity: isUpdatingPassword ? 0.7 : 1 }}
        >
          <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
            {isUpdatingPassword ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                Confirmer
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: 20, 
            paddingTop: 40,
            paddingBottom: 10
          }}>
            <Pressable onPress={() => router.back()}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "700", color: colors.text }}>
              Réinitialiser le mot de passe
            </Text>
          </View>

          {/* Content */}
          {step === 'email' && renderEmailStep()}
          {step === 'otp' && renderOtpStep()}
          {step === 'newPassword' && renderNewPasswordStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
