import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as Location from 'expo-location';
import { Colors } from '../../constants/Colors';
import FeaturedCarousel from '../../components/FeaturedCarousel';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Club {
  club_id: string;
  name: string;
  city: string;
  images: string[];
  entry_price_male: number;
  entry_price_female: number;
  entry_price_couple: number;
  rating: number;
  description: string;
  distance?: number;
}

interface Event {
  event_id: string;
  title: string;
  club_name: string;
  event_date: string;
  ticket_price: number;
  flyer_image?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [featuredClubs, setFeaturedClubs] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchData();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [selectedCity, searchQuery, clubs]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      // Fetch clubs with location
      fetchClubsWithLocation(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Get location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [clubsRes, citiesRes, featuredClubsRes, featuredEventsRes] = await Promise.all([
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/clubs`),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/cities`),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/clubs/featured`),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/events/featured`),
      ]);
      
      setClubs(clubsRes.data);
      setCities(['All', ...citiesRes.data.cities]);
      
      // Format for carousel
      const clubCarousel = featuredClubsRes.data.map((club: any) => ({
        id: club.club_id,
        title: club.name,
        subtitle: club.city,
        image: club.images?.[0],
        type: 'club',
        rating: club.rating,
        price: `From ₹${Math.min(club.entry_price_male, club.entry_price_female, club.entry_price_couple)}`,
      }));
      
      const eventCarousel = featuredEventsRes.data.map((event: any) => ({
        id: event.event_id,
        title: event.title,
        subtitle: `${event.club_name} • ${event.event_date}`,
        image: event.flyer_image,
        type: 'event',
        price: event.ticket_price === 0 ? 'FREE' : `₹${event.ticket_price}`,
      }));
      
      setFeaturedClubs(clubCarousel);
      setFeaturedEvents(eventCarousel);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load clubs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClubsWithLocation = async (lat: number, lon: number) => {
    try {
      const response = await axios.get(
        `${EXPO_PUBLIC_BACKEND_URL}/api/clubs?latitude=${lat}&longitude=${lon}`
      );
      setClubs(response.data);
    } catch (error) {
      console.error('Error fetching clubs with location:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filterClubs = () => {
    let filtered = clubs;

    if (selectedCity !== 'All') {
      filtered = filtered.filter((club) => club.city === selectedCity);
    }

    if (searchQuery) {
      filtered = filtered.filter((club) =>
        club.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredClubs(filtered);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <TouchableOpacity onPress={() => setShowCityModal(true)}>
              <Text style={styles.locationText}>{selectedCity}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="navigate" size={24} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clubs..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Featured Clubs Carousel */}
        {featuredClubs.length > 0 && (
          <FeaturedCarousel items={featuredClubs} title="Featured Clubs" />
        )}

        {/* Featured Events Carousel */}
        {featuredEvents.length > 0 && (
          <FeaturedCarousel items={featuredEvents} title="Upcoming Events" />
        )}

        {/* City Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Browse by City</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityFilter}>
            {cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={[
                  styles.cityChip,
                  selectedCity === city && styles.cityChipActive,
                ]}
                onPress={() => setSelectedCity(city)}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    selectedCity === city && styles.cityChipTextActive,
                  ]}
                >
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Clubs List */}
        <View style={styles.clubsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCity === 'All' ? 'All Clubs' : `Clubs in ${selectedCity}`}
          </Text>
          
          {filteredClubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="beer-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No clubs found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          ) : (
            filteredClubs.map((club) => (
              <TouchableOpacity
                key={club.club_id}
                style={styles.clubCard}
                onPress={() => router.push(`/club/${club.club_id}`)}
              >
                {club.images && club.images.length > 0 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${club.images[0]}` }}
                    style={styles.clubImage}
                  />
                ) : (
                  <View style={[styles.clubImage, styles.clubImagePlaceholder]}>
                    <Ionicons name="beer" size={48} color={Colors.primary} />
                  </View>
                )}

                <View style={styles.clubInfo}>
                  <View style={styles.clubHeader}>
                    <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color={Colors.primary} />
                      <Text style={styles.rating}>{club.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.clubLocation}>
                    <Ionicons name="location" size={14} color={Colors.textSecondary} />
                    <Text style={styles.locationTextSmall}>{club.city}</Text>
                    {club.distance && (
                      <Text style={styles.distanceText}>• {club.distance.toFixed(1)} km</Text>
                    )}
                  </View>

                  <Text style={styles.clubDescription} numberOfLines={2}>
                    {club.description}
                  </Text>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Entry from</Text>
                    <Text style={styles.priceValue}>
                      ₹{Math.min(club.entry_price_male, club.entry_price_female, club.entry_price_couple)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* City Selection Modal */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.cityList}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityOption,
                    selectedCity === city && styles.cityOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCity(city);
                    setShowCityModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.cityOptionText,
                      selectedCity === city && styles.cityOptionTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                  {selectedCity === city && (
                    <Ionicons name="checkmark" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.useLocationButton}
              onPress={() => {
                setShowCityModal(false);
                getCurrentLocation();
              }}
            >
              <Ionicons name="navigate" size={20} color={Colors.background} />
              <Text style={styles.useLocationText}>Use Current Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cityFilter: {
    paddingHorizontal: 16,
  },
  cityChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cityChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  cityChipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  clubsSection: {
    padding: 16,
  },
  clubCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clubImage: {
    width: '100%',
    height: 200,
  },
  clubImagePlaceholder: {
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubInfo: {
    padding: 16,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  clubLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationTextSmall: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  distanceText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  clubDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  priceValue: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
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
  cityList: {
    maxHeight: 400,
  },
  cityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityOptionActive: {
    backgroundColor: Colors.backgroundDark,
  },
  cityOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  cityOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  useLocationText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
