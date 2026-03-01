import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

export default function OTPLoginScreen() {
  const router = useRouter();
  const { sendOTP, confirmOTP, setupRecaptcha } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const otpInputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Setup reCAPTCHA on mount (web only)
    if (Platform.OS === 'web') {
      setTimeout(() => {
        setupRecaptcha('recaptcha-container');
        setRecaptchaReady(true);
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned.slice(0, 10);
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;

    // Re-setup recaptcha if it was cleared
    if (Platform.OS === 'web' && !recaptchaReady) {
      setupRecaptcha('recaptcha-container');
      setRecaptchaReady(true);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const result = await sendOTP(fullPhone);
    setLoading(false);

    if (result.success) {
      setStep('otp');
      setTimer(120);
    } else {
      Alert.alert('Error', result.message || 'Failed to send OTP');
      // Reset recaptcha for retry
      setRecaptchaReady(false);
      setTimeout(() => {
        setupRecaptcha('recaptcha-container');
        setRecaptchaReady(true);
      }, 500);
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const otpString = otpCode || otp.join('');

    if (otpString.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit code');
      return;
    }

    if (name.trim()) {
      setLoading(true);
      const result = await confirmOTP(otpString, name.trim());
      setLoading(false);

      if (result.success) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Verification Failed', result.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        otpInputs.current[0]?.focus();
      }
    } else {
      setStep('name');
    }
  };

  const handleCompleteRegistration = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name');
      return;
    }

    setLoading(true);
    const otpString = otp.join('');
    const result = await confirmOTP(otpString, name.trim());
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      Alert.alert('Error', result.message || 'Registration failed');
    }
  };

  const handleResendOTP = () => {
    if (timer > 0) {
      Alert.alert('Please Wait', `You can resend OTP in ${timer} seconds`);
      return;
    }
    setOtp(['', '', '', '', '', '']);
    setRecaptchaReady(false);
    setTimeout(() => {
      setupRecaptcha('recaptcha-container');
      setRecaptchaReady(true);
      handleSendOTP();
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundDark, Colors.backgroundCard]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>India's Premium Nightlife Booking</Text>
          </View>

          {/* Phone Input */}
          {step === 'phone' && (
            <View style={styles.formContainer}>
              <Text style={styles.title}>Enter Mobile Number</Text>
              <Text style={styles.description}>We'll send you a verification code via SMS</Text>

              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhone(text))}
                  autoFocus
                  data-testid="phone-input"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading || phone.length !== 10}
                data-testid="send-otp-btn"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.ageWarning}>You must be 21+ to use this service</Text>
            </View>
          )}

          {/* OTP Input */}
          {step === 'otp' && (
            <View style={styles.formContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('phone')}>
                <Ionicons name="arrow-back" size={24} color={Colors.primary} />
              </TouchableOpacity>

              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.description}>Code sent to +91 {phone}</Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpInputs.current[index] = ref)}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(value) => handleOTPChange(value, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleOTPKeyPress(nativeEvent.key, index)
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </View>

              {timer > 0 ? (
                <Text style={styles.timerText}>
                  Resend OTP in {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOTP}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.buttonMarginTop]}
                onPress={() => handleVerifyOTP()}
                disabled={loading || otp.some((digit) => !digit)}
                data-testid="verify-otp-btn"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Name Input */}
          {step === 'name' && (
            <View style={styles.formContainer}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.description}>Enter your full name to continue</Text>

              <TextInput
                style={styles.nameInput}
                placeholder="Your Full Name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
                data-testid="name-input"
              />

              <TouchableOpacity
                style={[styles.button, name.trim().length < 2 && styles.buttonDisabled]}
                onPress={handleCompleteRegistration}
                disabled={loading || name.trim().length < 2}
                data-testid="complete-registration-btn"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>

          {/* reCAPTCHA Container (invisible, web only) */}
          <View nativeID="recaptcha-container" style={styles.recaptchaContainer} />
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryCodeText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: Colors.text,
    fontSize: 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nameInput: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: Colors.text,
    fontSize: 18,
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonMarginTop: {
    marginTop: 16,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  timerText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  ageWarning: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  recaptchaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0,
  },
});
