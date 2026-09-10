import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
}

const PORTFOLIO_STOCKS: Stock[] = [
  { ticker: 'AGVO', name: 'Agrivoltaic Inc', price: 12.45, change: 0.32, changePercent: 2.64, sector: 'Clean Energy' },
  { ticker: 'CBRS', name: 'Cobalt Recovery Systems', price: 8.92, change: -0.15, changePercent: -1.65, sector: 'Materials' },
  { ticker: 'MU', name: 'Micron Technology', price: 98.76, change: 2.10, changePercent: 2.17, sector: 'Semiconductors' },
  { ticker: 'SNDK', name: 'SanDisk Corp', price: 67.34, change: 0.89, changePercent: 1.34, sector: 'Storage' },
  { ticker: 'STX', name: 'Seagate Technology', price: 82.15, change: -1.20, changePercent: -1.44, sector: 'Storage' },
  { ticker: 'GEV', name: 'GE Vernova', price: 245.80, change: 5.40, changePercent: 2.25, sector: 'Energy' },
  { ticker: 'BE', name: 'Bloom Energy', price: 18.50, change: -0.45, changePercent: -2.37, sector: 'Clean Energy' },
];

export default function PortfolioScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>(PORTFOLIO_STOCKS);

  const totalValue = stocks.reduce((sum, s) => sum + s.price, 0);
  const totalChange = stocks.reduce((sum, s) => sum + s.change, 0);
  const totalChangePercent = (totalChange / (totalValue - totalChange)) * 100;

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call — swap for real data feed
    setTimeout(() => {
      // Add small random wiggle to prices
      setStocks(prev => prev.map(s => ({
        ...s,
        price: +(s.price + (Math.random() - 0.5) * 0.5).toFixed(2),
        change: +(s.change + (Math.random() - 0.5) * 0.1).toFixed(2),
      })));
      setRefreshing(false);
    }, 1000);
  };

  const renderItem = ({ item }: { item: Stock }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.ticker}>{item.ticker}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <Text style={[styles.change, item.change >= 0 ? styles.positive : styles.negative]}>
            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.sector}>{item.sector}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>${totalValue.toFixed(2)}</Text>
          <Text style={[styles.summaryChange, totalChange >= 0 ? styles.positive : styles.negative]}>
            {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)} ({totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      <FlatList
        data={stocks}
        keyExtractor={(item) => item.ticker}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Text style={styles.footer}>
        Data is simulated. Connect Alpha Vantage, Finnhub, or Polygon for live prices.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summary: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  summaryChange: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticker: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  name: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  change: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  sector: {
    fontSize: 12,
    color: '#666666',
  },
  footer: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
    padding: 12,
  },
});
