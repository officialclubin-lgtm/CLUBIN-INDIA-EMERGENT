import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { TERMS_AND_CONDITIONS, ID_VERIFICATION_WARNING } from '../../constants/Terms';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const ID_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
];

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { sessionToken, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: user?.phone || '',
    age: user?.age?.toString() || '',
    date_of_birth: user?.date_of_birth || '',
    id_card_type: user?.id_card_type || 'aadhaar',
    id_card_number: user?.id_card_number || '',
    id_card_image: user?.id_card_image || '',
    terms_accepted: user?.terms_accepted || false,
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permission to upload ID');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, id_card_image: result.assets[0].base64 });
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDOBChange = (dob: string) => {
    setFormData({ ...formData, date_of_birth: dob });
    if (dob.length === 10) {
      const age = calculateAge(dob);
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  };

  const validateForm = () => {
    if (!formData.phone || formData.phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return false;
    }
    if (!formData.age || parseInt(formData.age) < 21) {
      Alert.alert('Age Requirement', 'You must be 21 years or older to use CLUBIN INDIA');
      return false;
    }
    if (!formData.date_of_birth) {
      Alert.alert('Date of Birth Required', 'Please enter your date of birth');
      return false;
    }
    if (!formData.id_card_type) {
      Alert.alert('ID Type Required', 'Please select your ID card type');
      return false;
    }
    if (!formData.id_card_number) {
      Alert.alert('ID Number Required', 'Please enter your ID card number');
      return false;
    }
    if (!formData.id_card_image) {
      Alert.alert('ID Image Required', 'Please upload a clear photo of your ID card');
      return false;
    }
    if (!formData.terms_accepted) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await axios.put(
        `${EXPO_PUBLIC_BACKEND_URL}/api/auth/profile`,
        {
          phone: formData.phone,
          age: parseInt(formData.age),
          date_of_birth: formData.date_of_birth,
          id_card_type: formData.id_card_type,
          id_card_number: formData.id_card_number,
          id_card_image: formData.id_card_image,
          terms_accepted: formData.terms_accepted,
        },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );

      Alert.alert(
        'Profile Completed!',
        'Your profile has been submitted for verification. You can now explore and book clubs.',
        [{ text: 'Start Exploring', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <Text style={styles.headerSubtitle}>Required for booking verification</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color={Colors.warning} />
          <Text style={styles.warningText}>{ID_VERIFICATION_WARNING}</Text>
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit phone number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            maxLength={10}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
          />
        </View>

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            placeholder="1995-01-15"
            placeholderTextColor={Colors.textMuted}
            value={formData.date_of_birth}
            onChangeText={handleDOBChange}
            maxLength={10}
          />
          {formData.age && (
            <Text style={styles.ageDisplay}>
              Age: {formData.age} years {parseInt(formData.age) >= 21 ? '✓' : '✗'}
            </Text>
          )}
        </View>

        {/* ID Card Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Government ID Type *</Text>
          <View style={styles.idTypeContainer}>
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.idTypeButton,
                  formData.id_card_type === type.value && styles.idTypeButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, id_card_type: type.value })}
              >
                <Text
                  style={[
                    styles.idTypeText,
                    formData.id_card_type === type.value && styles.idTypeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ID Card Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Card Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your ID number"
            placeholderTextColor={Colors.textMuted}
            value={formData.id_card_number}
            onChangeText={(text) => setFormData({ ...formData, id_card_number: text })}
            autoCapitalize="characters"
          />
        </View>

        {/* ID Card Image */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Upload ID Card Photo *</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            {formData.id_card_image ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${formData.id_card_image}` }}
                  style={styles.idImage}
                />
                <Text style={styles.changeImageText}>Tap to change</Text>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera" size={48} color={Colors.primary} />
                <Text style={styles.uploadText}>Take or Upload Photo</Text>
                <Text style={styles.uploadSubtext}>Clear photo of your ID card</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms and Conditions */}
        <TouchableOpacity
          style={styles.termsContainer}
          onPress={() => setFormData({ ...formData, terms_accepted: !formData.terms_accepted })}
        >
          <View
            style={[
              styles.checkbox,
              formData.terms_accepted && styles.checkboxActive,
            ]}
          >
            {formData.terms_accepted && (
              <Ionicons name="checkmark" size={18} color={Colors.background} />
            )}
          </View>
          <Text style={styles.termsText}>
            I certify that I am 21+ years old and the information provided is genuine. I have read and agree to the{' '}
            <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
              Terms & Conditions
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!formData.terms_accepted || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || !formData.terms_accepted}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Complete Profile & Start Booking</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Terms Modal */}
      <Modal
        visible={showTerms}
        animationType="slide"
        onRequestClose={() => setShowTerms(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <TouchableOpacity onPress={() => setShowTerms(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.termsFullText}>{TERMS_AND_CONDITIONS}</Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => {
              setFormData({ ...formData, terms_accepted: true });
              setShowTerms(false);
            }}
          >
            <Text style={styles.acceptButtonText}>I Accept</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    color: Colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
  },
  ageDisplay: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  idTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  idTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  idTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  idTypeText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  idTypeTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    padding: 40,
    alignItems: 'center',
  },
  uploadText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  uploadSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  imagePreview: {
    position: 'relative',
  },
  idImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  changeImageText: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.primary,
    color: Colors.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  termsFullText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
