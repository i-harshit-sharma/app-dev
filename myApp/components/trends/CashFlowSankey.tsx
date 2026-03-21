import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

interface CashFlowSankeyProps {
  income: number;
  fixed: number;
  variable: number;
  savings: number;
}

function formatCurrency(value: number): string {
  return `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
}

function flowWidth(value: number, max: number): number {
  return Math.max(10, (Math.max(0, value) / Math.max(max, 1)) * 30);
}

export default function CashFlowSankey({ income, fixed, variable, savings }: CashFlowSankeyProps) {
  const totalOut = Math.max(0, fixed) + Math.max(0, variable) + Math.max(0, savings);
  const base = Math.max(income, totalOut, 1);

  const fixedW = flowWidth(fixed, base);
  const variableW = flowWidth(variable, base);
  const savingsW = flowWidth(savings, base);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cash Flow Sankey</Text>
      <Text style={styles.subtitle}>Current month source-to-use map</Text>

      <Svg width="100%" height={210} viewBox="0 0 360 210">
        <Rect x={18} y={78} width={72} height={52} rx={10} fill="#E6F0FF" stroke="#D6E5FF" />
        <SvgText x={54} y={102} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E3A8A">Income</SvgText>
        <SvgText x={54} y={118} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{formatCurrency(income)}</SvgText>

        <Rect x={270} y={24} width={76} height={42} rx={10} fill="#FFF1ED" stroke="#FFD8CC" />
        <SvgText x={308} y={43} textAnchor="middle" fontSize="10" fontWeight="700" fill="#9A3412">Fixed</SvgText>
        <SvgText x={308} y={57} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{formatCurrency(fixed)}</SvgText>

        <Rect x={270} y={85} width={76} height={42} rx={10} fill="#FFF8E7" stroke="#FFE7B0" />
        <SvgText x={308} y={104} textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400E">Variable</SvgText>
        <SvgText x={308} y={118} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{formatCurrency(variable)}</SvgText>

        <Rect x={270} y={146} width={76} height={42} rx={10} fill="#EAFBF2" stroke="#C9F2DC" />
        <SvgText x={308} y={165} textAnchor="middle" fontSize="10" fontWeight="700" fill="#166534">Savings</SvgText>
        <SvgText x={308} y={179} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{formatCurrency(savings)}</SvgText>

        <Path d={`M 90 92 C 170 92, 200 44, 270 44`} stroke="#F06449" strokeWidth={fixedW} fill="none" strokeOpacity={0.75} />
        <Path d={`M 90 104 C 170 104, 200 106, 270 106`} stroke="#F59E0B" strokeWidth={variableW} fill="none" strokeOpacity={0.75} />
        <Path d={`M 90 116 C 170 116, 200 166, 270 166`} stroke="#1E9C6B" strokeWidth={savingsW} fill="none" strokeOpacity={0.75} />
      </Svg>
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
});
