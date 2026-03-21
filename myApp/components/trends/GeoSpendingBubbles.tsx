import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

export interface GeoBubblePoint {
  id: string;
  amount: number;
  title: string;
  category: string;
  paymentMethod?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
}

interface GeoSpendingBubblesProps {
  points: GeoBubblePoint[];
}

const CITY_HINTS: Record<string, { lat: number; lon: number }> = {
  delhi: { lat: 28.6139, lon: 77.209 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  pune: { lat: 18.5204, lon: 73.8567 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
};

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function normalizePoint(point: GeoBubblePoint, index: number) {
  if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
    return { lat: Number(point.latitude), lon: Number(point.longitude) };
  }

  const hint = (point.location || '').toLowerCase();
  const match = Object.entries(CITY_HINTS).find(([key]) => hint.includes(key));
  if (match) return match[1];

  // India-ish fallback spread so points are still visible when no coordinates exist.
  return {
    lat: 8 + ((index * 7.7) % 28),
    lon: 68 + ((index * 11.3) % 28),
  };
}

export default function GeoSpendingBubbles({ points }: GeoSpendingBubblesProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const methods = useMemo(() => {
    const all = Array.from(new Set(points.map((p) => p.paymentMethod || 'Other')));
    return ['All', ...all];
  }, [points]);

  const filtered = useMemo(() => (
    selectedMethod === 'All'
      ? points
      : points.filter((p) => (p.paymentMethod || 'Other') === selectedMethod)
  ), [points, selectedMethod]);

  const maxAmount = Math.max(1, ...filtered.map((p) => p.amount));

  const plotted = filtered.map((point, index) => {
    const normalized = normalizePoint(point, index);
    const x = ((normalized.lon - 68) / 30) * 320 + 20;
    const y = 175 - (((normalized.lat - 8) / 30) * 155);
    const radius = 6 + ((point.amount / maxAmount) * 18);
    return { ...point, x, y, radius };
  });

  const selected = plotted.find((item) => item.id === selectedId) || plotted[0];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Geographic Spending Bubbles</Text>
      <Text style={styles.subtitle}>Current month spend distribution by location and size</Text>

      <View style={styles.filterRow}>
        {methods.slice(0, 4).map((method) => {
          const active = method === selectedMethod;
          return (
            <TouchableOpacity
              key={method}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedMethod(method)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{method}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Svg width="100%" height={190} viewBox="0 0 360 190">
        <Rect x={10} y={10} width={340} height={170} rx={14} fill="#F6FAFF" stroke="#E0EAF5" />
        {plotted.map((item) => (
          <Circle
            key={item.id}
            cx={item.x}
            cy={item.y}
            r={item.radius}
            fill={item.id === selected?.id ? '#2979FF' : '#5EA3FF'}
            fillOpacity={item.id === selected?.id ? 0.7 : 0.45}
            onPress={() => setSelectedId(item.id)}
          />
        ))}
        <SvgText x={16} y={24} fontSize={9} fill="#64748B">North</SvgText>
        <SvgText x={16} y={176} fontSize={9} fill="#64748B">South</SvgText>
      </Svg>

      {selected ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selected.title}</Text>
          <Text style={styles.detailText}>{selected.category} • {selected.paymentMethod || 'Other'}</Text>
          <Text style={styles.detailAmount}>{formatCurrency(selected.amount)}</Text>
        </View>
      ) : (
        <Text style={styles.empty}>No geo spending data this month.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECF2',
    padding: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1D2B3A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#DDE6EF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#EAF2FF',
    borderColor: '#BDD6FF',
  },
  filterText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#1E40AF',
  },
  detailBox: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: '#E7EEF6',
    padding: 10,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D2B3A',
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  detailAmount: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  empty: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
});
