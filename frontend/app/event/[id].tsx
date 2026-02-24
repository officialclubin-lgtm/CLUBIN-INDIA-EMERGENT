import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { Colors } from '../../constants/Colors';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Event {
  event_id: string;
  title: string;
  club_id: string;
  club_name: string;
  description: string;
  flyer_image?: string;
  layout_image?: string;
  video_url?: string;
  event_date: string;
  event_time: string;
  event_day: string;
  artists: Array<{ name: string; role: string; image?: string }>;
  organized_by?: string;
  promoted_by?: string;
  sponsored_by: string[];
  ticket_price: number;
  available_tickets: number;
  category: string;
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Event Flyer */}
        <View style={styles.flyerContainer}>
          {event.flyer_image ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${event.flyer_image}` }}
              style={styles.flyerImage}
            />
          ) : (
            <View style={[styles.flyerImage, styles.flyerPlaceholder]}>
              <Ionicons name="calendar" size={64} color={Colors.primary} />
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Event Badge */}
          <View style={styles.badge}>
            <Ionicons name="flash" size={16} color={Colors.background} />
            <Text style={styles.badgeText}>LIVE EVENT</Text>
          </View>

          {/* Event Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Event Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="calendar" size={24} color={Colors.primary} />
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{event.event_date}</Text>
              <Text style={styles.infoSubvalue}>{event.event_day}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="time" size={24} color={Colors.primary} />
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{event.event_time}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="location" size={24} color={Colors.primary} />
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{event.club_name}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Artists */}
          {event.artists && event.artists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Artists</Text>
              {event.artists.map((artist, index) => (
                <View key={index} style={styles.artistCard}>
                  <View style={styles.artistIcon}>
                    <Ionicons name="mic" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.artistInfo}>
                    <Text style={styles.artistName}>{artist.name}</Text>
                    <Text style={styles.artistRole}>{artist.role}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Event Layout */}
          {event.layout_image && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue Layout</Text>
              <Image
                source={{ uri: `data:image/jpeg;base64,${event.layout_image}` }}
                style={styles.layoutImage}
              />
            </View>
          )}

          {/* Organizers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            {event.organized_by && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Organized by:</Text>
                <Text style={styles.detailValue}>{event.organized_by}</Text>
              </View>
            )}
            {event.promoted_by && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Promoted by:</Text>
                <Text style={styles.detailValue}>{event.promoted_by}</Text>
              </View>
            )}
            {event.sponsored_by && event.sponsored_by.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sponsored by:</Text>
                <Text style={styles.detailValue}>{event.sponsored_by.join(', ')}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Ticket Price</Text>
          <Text style={styles.price}>
            {event.ticket_price === 0 ? 'FREE ENTRY' : `₹${event.ticket_price}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => router.push(`/club/${event.club_id}`)}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.text,
    fontSize: 18,
  },
  flyerContainer: {
    position: 'relative',
  },
  flyerImage: {
    width: '100%',
    height: 400,
  },
  flyerPlaceholder: {
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: Colors.overlay,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  infoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  infoSubvalue: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  artistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundDark,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  artistRole: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  layoutImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    width: 120,
  },
  detailValue: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    gap: 16,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  price: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  bookButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
