// [LOCAL] — onboarding carousel de 3 telas
import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, StyleSheet, Pressable, type ListRenderItem } from 'react-native';
import { Ionicons } from '../../src/platform/icons';
import { useAppState } from '../../src/contexts/AppStateContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { router } from '../../src/platform/router';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'cart-outline',
    title: 'Organize suas vendas',
    subtitle: 'Venda em qualquer lugar, mesmo sem internet. Tudo salvo no seu celular.',
  },
  {
    id: '2',
    icon: 'people-outline',
    title: 'Controle seus clientes',
    subtitle: 'Clientes, estoque e financeiro na palma da m\u00e3o.',
  },
  {
    id: '3',
    icon: 'bar-chart-outline',
    title: 'Acompanhe resultados',
    subtitle: 'Seu assistente de vendas, sempre com voc\u00ea. Relat\u00f3rios e metas em tempo real.',
  },
];

export default function OnboardingScreen() {
  const { setOnboarded } = useAppState();
  const { colors } = useTheme();
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const finish = async () => {
    await setOnboarded();
    router.replace('/setup');
  };

  const next = () => {
    if (currentIndex < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finish();
    }
  };

  const renderItem: ListRenderItem<Slide> = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={item.icon} size={80} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {currentIndex < slides.length - 1 && (
        <Pressable style={styles.skip} onPress={finish} hitSlop={12}>
          <Text style={[styles.skipText, { color: colors.primary }]}>Pular</Text>
        </Pressable>
      )}

      <FlatList
        ref={flatRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>
        <Pressable
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={next}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === slides.length - 1 ? 'Vamos come\u00e7ar' : 'Pr\u00f3ximo'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { fontSize: 16, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center', gap: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  nextBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', width: '100%' },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
