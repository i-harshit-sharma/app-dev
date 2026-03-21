import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface WaterfallStep {
  label: string;
  value: number;
}

interface MonthlyWaterfallChartProps {
  steps: WaterfallStep[];
}

function formatCurrency(value: number): string {
  return `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
}

export default function MonthlyWaterfallChart({ steps }: MonthlyWaterfallChartProps) {
  if (!steps.length) return null;

  let running = 0;
  const computed = steps.map((step) => {
    const start = running;
    running += step.value;
    const end = running;
    return { ...step, start, end };
  });

  const max = Math.max(...computed.map((s) => Math.max(s.start, s.end)), 1);
  const min = Math.min(...computed.map((s) => Math.min(s.start, s.end)), 0);
  const range = Math.max(1, max - min);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Monthly Waterfall</Text>
      <Text style={styles.subtitle}>How money flows from income to month-end balance</Text>

      <View style={styles.row}>
        {computed.map((step) => {
          const positive = step.value >= 0;
          const top = ((max - Math.max(step.start, step.end)) / range) * 150;
          const height = (Math.abs(step.value) / range) * 150;

          return (
            <View key={step.label} style={styles.barWrap}>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    {
                      top,
                      height: Math.max(10, height),
                      backgroundColor: positive ? '#1E9C6B' : '#F06449',
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>
                {positive ? '+' : '-'}{formatCurrency(step.value)}
              </Text>
              <Text style={styles.barLabel}>{step.label}</Text>
            </View>
          );
        })}
      </View>
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
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
  },
  track: {
    width: '100%',
    maxWidth: 48,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#F4F7FB',
    position: 'relative',
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderRadius: 8,
  },
  barValue: {
    marginTop: 6,
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
  },
  barLabel: {
    marginTop: 2,
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
  },
});
