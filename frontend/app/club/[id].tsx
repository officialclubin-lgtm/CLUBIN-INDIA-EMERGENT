import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Club {
  club_id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  images: string[];
  entry_price_male: number;
  entry_price_female: number;
  entry_price_couple: number;
  events: any[];
  available_slots: number;
  rating: number;
}

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { sessionToken } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedEntryType, setSelectedEntryType] = useState<'male' | 'female' | 'couple'>('male');
  const [quantity, setQuantity] = useState(1);
  const [entryDate, setEntryDate] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchClubDetails();
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setEntryDate(today);
  }, [id]);

  const fetchClubDetails = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/clubs/${id}`);
      setClub(response.data);
    } catch (error) {
      console.error('Error fetching club:', error);
      Alert.alert('Error', 'Failed to load club details');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!club || !sessionToken) return;

    setBooking(true);
    try {
      // Create booking
      const bookingResponse = await axios.post(
        `${EXPO_PUBLIC_BACKEND_URL}/api/bookings`,
        {
          club_id: club.club_id,
          entry_type: selectedEntryType,
          quantity,
          entry_date: entryDate,
        },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );

      const bookingData = bookingResponse.data;

      // Create payment order
      const orderResponse = await axios.post(
        `${EXPO_PUBLIC_BACKEND_URL}/api/payment/create-order`,
        { booking_id: bookingData.booking_id },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );

      // In a real app, open Razorpay payment gateway here
      // For demo, we'll auto-confirm
      Alert.alert(
        'Payment Demo',
        'In production, Razorpay payment gateway will open here. For now, auto-confirming...',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Auto-verify for demo
              await axios.post(
                `${EXPO_PUBLIC_BACKEND_URL}/api/payment/verify`,
                {
                  razorpay_order_id: orderResponse.data.order_id,
                  razorpay_payment_id: 'demo_payment_' + Date.now(),
                  razorpay_signature: 'demo_signature',
                  booking_id: bookingData.booking_id,
                },
                {
                  headers: { Authorization: `Bearer ${sessionToken}` },
                }
              );

              setBookingModalVisible(false);
              Alert.alert(
                'Success!',
                'Your booking is confirmed. Check My Bookings for your QR code.',
                [
                  {
                    text: 'View Booking',
                    onPress: () => router.push(`/booking/${bookingData.booking_id}`),
                  },
                  { text: 'OK' },
                ]
              );
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setBooking(false);
    }
  };

  const getPriceForEntryType = () => {
    if (!club) return 0;
    const prices = {
      male: club.entry_price_male,
      female: club.entry_price_female,
      couple: club.entry_price_couple,
    };
    return prices[selectedEntryType];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Club not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
          {club.images && club.images.length > 0 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${club.images[0]}` }}
              style={styles.heroImage}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
              <Ionicons name="beer" size={64} color="#6B7280" />
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.clubName}>{club.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={20} color="#FCD34D" />
                <Text style={styles.rating}>{club.rating}</Text>
              </View>
            </View>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#9CA3AF" />
              <Text style={styles.locationText}>{club.address}, {club.city}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{club.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entry Prices</Text>
            <View style={styles.pricesContainer}>
              <View style={styles.priceCard}>
                <Ionicons name="male" size={24} color="#8B5CF6" />
                <Text style={styles.priceLabel}>Male</Text>
                <Text style={styles.priceAmount}>₹{club.entry_price_male}</Text>
              </View>
              <View style={styles.priceCard}>
                <Ionicons name="female" size={24} color="#EC4899" />
                <Text style={styles.priceLabel}>Female</Text>
                <Text style={styles.priceAmount}>₹{club.entry_price_female}</Text>
              </View>
              <View style={styles.priceCard}>
                <Ionicons name="people" size={24} color="#10B981" />
                <Text style={styles.priceLabel}>Couple</Text>
                <Text style={styles.priceAmount}>₹{club.entry_price_couple}</Text>
              </View>
            </View>
          </View>

          {club.events && club.events.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              {club.events.map((event, index) => (
                <View key={index} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDetails}>{event.date} • DJ {event.dj_name}</Text>
                  <Text style={styles.eventDescription}>{event.description}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Starting from</Text>
          <Text style={styles.footerPrice}>
            ₹{Math.min(club.entry_price_male, club.entry_price_female, club.entry_price_couple)}
          </Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={() => setBookingModalVisible(true)}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Entry</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Entry Type</Text>
              <View style={styles.entryTypeContainer}>
                {(['male', 'female', 'couple'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.entryTypeButton,
                      selectedEntryType === type && styles.entryTypeButtonActive,
                    ]}
                    onPress={() => setSelectedEntryType(type)}
                  >
                    <Text
                      style={[
                        styles.entryTypeText,
                        selectedEntryType === type && styles.entryTypeTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Entry Date</Text>
              <TextInput
                style={styles.dateInput}
                value={entryDate}
                onChangeText={setEntryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B7280"
              />

              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>₹{getPriceForEntryType() * quantity}</Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmButton, booking && styles.confirmButtonDisabled]}
                onPress={handleBooking}
                disabled={booking}
              >
                {booking ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 300,
  },
  heroImagePlaceholder: {
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  description: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
  },
  pricesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  priceAmount: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  eventCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDetails: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  eventDescription: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F1F1F',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  footerPrice: {
    color: '#8B5CF6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  entryTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  entryTypeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
  },
  entryTypeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  entryTypeText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  entryTypeTextActive: {
    color: '#FFF',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    backgroundColor: '#374151',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateInput: {
    backgroundColor: '#374151',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
  },
  totalLabel: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  totalAmount: {
    color: '#8B5CF6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
