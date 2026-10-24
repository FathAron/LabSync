// TASK-04 - PANEL DEV SEMENTARA.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_VERSION, useDemoDev } from './DemoProvider';

const STATUSES = ['PENDING', 'ACTIVE', 'CLOSED'] as const;

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

const Chip = ({ label, active = false, onPress }: ChipProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

const DevPanel = () => {
  const insets = useSafeAreaInsets();
  const dev = useDemoDev();
  const [open, setOpen] = useState(true);

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {open ? 'Sembunyikan' : 'Tampilkan'} Panel Dev (sementara) | data: {DEMO_VERSION}
        </Text>
      </Pressable>

      {open ? (
        <ScrollView style={styles.panel} nestedScrollEnabled>
          <Text style={styles.label}>Persona (meniru role/persona selector tim)</Text>
          <View style={styles.row}>
            {dev.students.map((s) => (
              <Chip
                key={s.id}
                label={`${s.name.split(' ')[0]} (${s.className})`}
                active={dev.studentId === s.id}
                onPress={() => dev.setStudentId(s.id)}
              />
            ))}
            <Chip
              label="Tanpa identitas"
              active={dev.studentId === null}
              onPress={() => dev.setStudentId(null)}
            />
          </View>

          <Text style={styles.label}>Status sesi (meniru aksi asisten)</Text>
          {dev.sessions.map((s) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.sessionId}>
                {s.id} ({s.className})
              </Text>
              {STATUSES.map((st) => (
                <Chip
                  key={st}
                  label={st}
                  active={s.status === st}
                  onPress={() => dev.setStatus(s.id, st)}
                />
              ))}
            </View>
          ))}

          <View style={styles.row}>
            <Chip label="Reset data" onPress={dev.resetAll} />
            <Chip label="Kosongkan jadwal" onPress={dev.clearSessions} />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: '#1F2937', paddingHorizontal: 12, paddingBottom: 6 },
  toggle: { paddingVertical: 6 },
  toggleText: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },
  panel: { maxHeight: 180 },
  label: { color: '#9CA3AF', fontSize: 11, marginTop: 6, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
  sessionId: { color: '#E5E7EB', fontSize: 12, marginRight: 8 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#374151',
    marginRight: 6,
    marginBottom: 4,
  },
  chipActive: { backgroundColor: '#2563EB' },
  chipText: { color: '#E5E7EB', fontSize: 11 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
});

export default DevPanel;
