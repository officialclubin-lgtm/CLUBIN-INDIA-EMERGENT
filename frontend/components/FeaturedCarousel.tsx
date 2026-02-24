import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_SPACING = 20;

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  type: 'club' | 'event';
  rating?: number;
  price?: string;
}

interface FeaturedCarouselProps {
  items: CarouselItem[];
  title: string;
}

export default function FeaturedCarousel({ items, title }: FeaturedCarouselProps) {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-scroll
  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % items.length;
        scrollViewRef.current?.scrollTo({
          x: next * (CARD_WIDTH + CARD_SPACING),
          animated: true,
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [items.length]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (CARD_WIDTH + CARD_SPACING));
    setActiveIndex(index);
  };

  const handlePress = (item: CarouselItem) => {
    if (item.type === 'club') {
      router.push(`/club/${item.id}`);
    } else {
      router.push(`/event/${item.id}`);
    }
  };

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Ionicons name="star" size={20} color={Colors.primary} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              index === 0 && styles.cardFirst,
              index === items.length - 1 && styles.cardLast,
            ]}
            onPress={() => handlePress(item)}
            activeOpacity={0.9}
          >
            {item.image ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${item.image}` }}
                style={styles.cardImage}
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons
                  name={item.type === 'club' ? 'beer' : 'calendar'}
                  size={64}
                  color={Colors.primary}
                />
              </View>
            )}

            <View style={styles.cardOverlay} />

            <View style={styles.cardContent}>
              {item.type === 'event' && (
                <View style={styles.eventBadge}>
                  <Ionicons name="flash" size={16} color={Colors.background} />
                  <Text style={styles.eventBadgeText}>LIVE EVENT</Text>
                </View>
              )}

              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>

              {item.subtitle && (
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              )}

              <View style={styles.cardFooter}>
                {item.rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color={Colors.primary} />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                )}
                {item.price && (
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      {items.length > 1 && (
        <View style={styles.dotsContainer}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  scrollContent: {
    paddingLeft: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: 240,
    marginRight: CARD_SPACING,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFirst: {
    marginLeft: 0,
  },
  cardLast: {
    marginRight: 20,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  eventBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  priceText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
});
