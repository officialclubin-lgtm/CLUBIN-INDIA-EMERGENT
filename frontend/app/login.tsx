import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundDark, Colors.backgroundCard]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Discover & Book Night Clubs</Text>
            <Text style={styles.tagline}>India's Premium Nightlife Booking Platform</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.loginButton} onPress={login}>
              <Ionicons name="logo-google" size={24} color={Colors.background} />
              <Text style={styles.loginButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.ageWarning}>
              <Ionicons name="warning-outline" size={20} color={Colors.primary} />
              <Text style={styles.ageWarningText}>You must be 21+ to use this service</Text>
            </View>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.primary,
    marginTop: 16,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  ageWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: Colors.backgroundCard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ageWarningText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
});
