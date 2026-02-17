import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Booking {
  booking_id: string;
  club_name: string;
  entry_type: string;
  quantity: number;
  total_amount: number;
  entry_date: string;
  status: string;
  qr_code?: string;
}

export default function BookingsScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'completed':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done-circle';
      default:
        return 'ellipse';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>Start exploring clubs and make your first booking!</Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.exploreButtonText}>Explore Clubs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {bookings.map((booking) => (
              <TouchableOpacity
                key={booking.booking_id}
                style={styles.bookingCard}
                onPress={() => router.push(`/booking/${booking.booking_id}`)}
              >
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingTitleContainer}>
                    <Text style={styles.clubName}>{booking.club_name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(booking.status)}20` },
                      ]}
                    >
                      <Ionicons
                        name={getStatusIcon(booking.status)}
                        size={14}
                        color={getStatusColor(booking.status)}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(booking.status) },
                        ]}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#9CA3AF" />
                    <Text style={styles.detailText}>{booking.entry_date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="people" size={16} color="#9CA3AF" />
                    <Text style={styles.detailText}>
                      {booking.quantity}x {booking.entry_type}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Total Amount</Text>
                    <Text style={styles.priceValue}>₹{booking.total_amount}</Text>
                  </View>
                  {booking.qr_code && (
                    <View style={styles.qrBadge}>
                      <Ionicons name="qr-code" size={20} color="#8B5CF6" />
                      <Text style={styles.qrText}>QR Available</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bookingsList: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bookingHeader: {
    marginBottom: 12,
  },
  bookingTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clubName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  priceValue: {
    color: '#8B5CF6',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
});
