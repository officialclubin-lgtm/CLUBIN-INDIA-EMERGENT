import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#6D28D9', '#4C1D95']}
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
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.loginButton} onPress={login}>
              <Ionicons name="logo-google" size={24} color="#8B5CF6" />
              <Text style={styles.loginButtonText}>Continue with Google</Text>
            </TouchableOpacity>

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
    paddingTop: 100,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#E9D5FF',
    marginTop: 16,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  termsText: {
    fontSize: 12,
    color: '#E9D5FF',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
});
