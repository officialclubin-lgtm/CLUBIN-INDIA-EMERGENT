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
}

export default function HomeScreen() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [selectedCity, searchQuery, clubs]);

  const fetchData = async () => {
    try {
      const [clubsRes, citiesRes] = await Promise.all([
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/clubs`),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/cities`),
      ]);
      setClubs(clubsRes.data);
      setCities(['All', ...citiesRes.data.cities]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Clubs</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clubs..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

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

        <View style={styles.clubsList}>
          {filteredClubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="beer-outline" size={64} color="#6B7280" />
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
                    <Ionicons name="beer" size={48} color="#6B7280" />
                  </View>
                )}

                <View style={styles.clubInfo}>
                  <View style={styles.clubHeader}>
                    <Text style={styles.clubName}>{club.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color="#FCD34D" />
                      <Text style={styles.rating}>{club.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.clubLocation}>
                    <Ionicons name="location" size={14} color="#9CA3AF" />
                    <Text style={styles.locationText}>{club.city}</Text>
                  </View>

                  <Text style={styles.clubDescription} numberOfLines={2}>
                    {club.description}
                  </Text>

                  <View style={styles.priceContainer}>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Entry from</Text>
                      <Text style={styles.priceValue}>₹{Math.min(club.entry_price_male, club.entry_price_female, club.entry_price_couple)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 12,
    fontSize: 16,
  },
  cityFilter: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  cityChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cityChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  cityChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  cityChipTextActive: {
    color: '#FFF',
  },
  clubsList: {
    padding: 16,
  },
  clubCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  clubImage: {
    width: '100%',
    height: 200,
  },
  clubImagePlaceholder: {
    backgroundColor: '#374151',
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
    fontSize: 14,
    fontWeight: '600',
  },
  clubLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  clubDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  priceValue: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
});
