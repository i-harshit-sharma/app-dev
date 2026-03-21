import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, DeviceEventEmitter, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomHeader() {
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];
  const router = useRouter();
  const pathname = usePathname();
  const isHomeTab = pathname === '/(tabs)' || pathname === '/(tabs)/index' || pathname === '/';

  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [isTranscribing, setIsTranscribing] = useState(false);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permission to app.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setIsTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(undefined);

      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setIsTranscribing(false);
      setRecording(undefined); // Ensure state is reset
    }
  }

  async function transcribeAudio(uri: string) {
    // TODO: Replace with actual API call (e.g., OpenAI Whisper)
    // For now, we simulate a delay and return mock text.
    console.log('Transcribing file at:', uri);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock result
    const mockText = "This is a simulated transcription of your audio. API integration required for real text.";
    Alert.alert("Transcription Result", mockText);
  }

  const handleMicPress = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.title, { color: theme.text }]}>Finvault</Text>
        <View style={styles.rightIcons}>
          {isHomeTab ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => DeviceEventEmitter.emit('home_search_focus')}
            >
              <Ionicons name="search-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          ) : null}

          {/* Commented out Mic and Camera as per request
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleMicPress}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Ionicons
                name={recording ? "stop-circle-outline" : "mic-outline"}
                size={24}
                color={recording ? "red" : theme.text}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/ocr-camera')}
          >
            <Ionicons name="camera-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          */}
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="more-vert" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    padding: 4,
  },
});