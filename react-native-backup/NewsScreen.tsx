import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  sourceColor: string;
  summary: string;
  url: string;
  publishedAt: string;
  category: string;
}

// Simulated news data — replace with NewsAPI.org, Finnhub, or Alpha Vantage News API
const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    headline: 'Micron Boosts AI Chip Output as Data Center Demand Surges',
    source: 'WSJ',
    sourceColor: '#1e3a5f',
    summary: 'Memory maker ramps production of high-bandwidth memory chips used in AI servers.',
    url: 'https://www.wsj.com/tech/ai',
    publishedAt: '2h ago',
    category: 'Tech',
  },
  {
    id: '2',
    headline: 'Clean Energy Stocks Rally on New Grid Investment Bill',
    source: 'Bloomberg',
    sourceColor: '#280071',
    summary: 'Senate committee advances $12B package for grid modernization and storage.',
    url: 'https://www.bloomberg.com/news/energy',
    publishedAt: '4h ago',
    category: 'Policy',
  },
  {
    id: '3',
    headline: 'Seagate and SanDisk Face Headwinds from PC Market Slump',
    source: 'CNBC',
    sourceColor: '#005594',
    summary: 'Storage demand weakens as enterprise buyers delay refresh cycles.',
    url: 'https://www.cnbc.com/technology',
    publishedAt: '5h ago',
    category: 'Tech',
  },
  {
    id: '4',
    headline: 'GE Vernova Wins Saudi Power Grid Contract Worth $2.4B',
    source: 'FT',
    sourceColor: '#fff1e5',
    summary: 'Deal covers gas turbines and grid infrastructure for NEOM project.',
    url: 'https://www.ft.com/companies/energy',
    publishedAt: '6h ago',
    category: 'Energy',
  },
  {
    id: '5',
    headline: 'Bloom Energy Partners with Korean Battery Giant on Solid Oxide',
    source: 'Bloomberg',
    sourceColor: '#280071',
    summary: 'Joint venture targets Asian data center market with fuel cell systems.',
    url: 'https://www.bloomberg.com/news/clean-energy',
    publishedAt: '8h ago',
    category: 'Clean Energy',
  },
  {
    id: '6',
    headline: 'Cobalt Prices Slide as Indonesian Supply Floods Market',
    source: 'FT',
    sourceColor: '#fff1e5',
    summary: 'Battery metal benchmark drops 18% year-to-date on oversupply concerns.',
    url: 'https://www.ft.com/markets/commodities',
    publishedAt: '10h ago',
    category: 'Commodities',
  },
  {
    id: '7',
    headline: 'Agrivoltaic Farms Show 40% Yield Boost in Arizona Pilot',
    source: 'WSJ',
    sourceColor: '#1e3a5f',
    summary: 'Solar panels over crops reduce water use while increasing energy output.',
    url: 'https://www.wsj.com/business/energy',
    publishedAt: '12h ago',
    category: 'Clean Energy',
  },
  {
    id: '8',
    headline: 'Semiconductor Index Hits Record on AI Infrastructure Buildout',
    source: 'CNBC',
    sourceColor: '#005594',
    summary: 'SOX index rises 3.2% as TSMC and Broadcom raise capex guidance.',
    url: 'https://www.cnbc.com/markets',
    publishedAt: '14h ago',
    category: 'Markets',
  },
];

export default function NewsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(MOCK_NEWS.map(n => n.category)))];
  const filteredNews = selectedCategory && selectedCategory !== 'All'
    ? news.filter(n => n.category === selectedCategory)
    : news;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const openArticle = (url: string) => {
    Linking.openURL(url).catch(() => {
      alert('Could not open article. Please check the URL.');
    });
  };

  const renderItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => openArticle(item.url)}>
      <View style={styles.cardHeader}>
        <View style={[styles.sourceBadge, { backgroundColor: item.sourceColor }]}u003e
          <Text style={styles.sourceText}>{item.source}</Text>
        </View>
        <Text style={styles.time}>{item.publishedAt}</Text>
      </View>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.summary}>{item.summary}</Text>
      <Text style={styles.category}>{item.category}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Market News</Text>
        <Text style={styles.subtitle}>Headlines with source attribution</Text>
      </View>

      <View style={styles.filterRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterBtn, (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && styles.filterBtnActive]}
            onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
          >
            <Text style={[styles.filterText, (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && styles.filterTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredNews}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <Text style={styles.footer}>
        Headlines link to original sources. Full articles require subscription.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#888888', marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: { fontSize: 13, color: '#888888' },
  filterTextActive: { color: '#ffffff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  time: { fontSize: 12, color: '#666666' },
  headline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: { fontSize: 13, color: '#aaaaaa', lineHeight: 18, marginBottom: 10 },
  category: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  footer: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
    padding: 12,
  },
});
