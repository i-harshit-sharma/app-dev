import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { ParserService } from '@/services/ParserService';
import { Ionicons } from '@expo/vector-icons';
import { requireOptionalNativeModule } from 'expo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type SpeechModule = {
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    isRecognitionAvailable: () => boolean;
    start: (options: Record<string, unknown>) => void;
    stop: () => void;
    addListener: (
        eventName: 'start' | 'end' | 'result' | 'error',
        listener: (event: unknown) => void
    ) => { remove: () => void };
};

const getSpeechModule = (): SpeechModule | null => {
    return requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');
};

export default function VoiceCommandScreen() {
    const router = useRouter();
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const speechModule = useMemo(() => getSpeechModule(), []);
    const transcriptInputRef = useRef<TextInput>(null);
    const transcriptRef = useRef('');
    const autoStartTriedRef = useRef(false);
    const [transcript, setTranscript] = useState('');
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    const processTranscriptToTransaction = useCallback((text: string, silentIfIncomplete = false) => {
        const nextDraft = ParserService.buildAddTransactionDraftFromVoice(text);

        if (!nextDraft.amount) {
            if (!silentIfIncomplete) {
                Alert.alert('Incomplete Command', 'Say or enter an amount so we can create the transaction.');
            }
            return;
        }

        router.replace({
            pathname: '/add-transaction',
            params: {
                amount: nextDraft.amount.toString(),
                title: nextDraft.title,
                category: nextDraft.category,
                type: nextDraft.type,
                method: nextDraft.method,
                date: nextDraft.date.toISOString(),
                notes: nextDraft.notes,
            },
        });
    }, [router]);

    useEffect(() => {
        if (!speechModule) {
            setErrorText('Native voice recognition is not available in this build. You can still use the keyboard mic or type a spoken-style command below.');
            return;
        }

        const subscriptions = [
            speechModule.addListener('start', () => {
                setIsRecognizing(true);
                setIsStarting(false);
                setErrorText(null);
            }),
            speechModule.addListener('end', () => {
                setIsRecognizing(false);
                setIsStarting(false);

                const finalText = transcriptRef.current.trim();
                if (finalText) {
                    processTranscriptToTransaction(finalText, true);
                }
            }),
            speechModule.addListener('result', (event) => {
                const resultEvent = event as { results?: Array<{ transcript?: string }> };
                const nextTranscript = resultEvent.results?.[0]?.transcript || '';
                if (nextTranscript) {
                    setTranscript(nextTranscript);
                }
            }),
            speechModule.addListener('error', (event) => {
                const errorEvent = event as { message?: string };
                setIsRecognizing(false);
                setIsStarting(false);
                setErrorText(errorEvent.message || 'Speech recognition failed.');
            }),
        ];

        return () => {
            subscriptions.forEach((subscription) => subscription.remove());
        };
    }, [processTranscriptToTransaction, speechModule]);

    const draft = useMemo(() => ParserService.buildAddTransactionDraftFromVoice(transcript), [transcript]);

    const handleStartListening = async () => {
        if (!speechModule) {
            transcriptInputRef.current?.focus();
            return;
        }

        try {
            setIsStarting(true);
            setErrorText(null);

            const permission = await speechModule.requestPermissionsAsync();
            if (!permission.granted) {
                setIsStarting(false);
                Alert.alert('Permission Required', 'Please allow microphone and speech recognition permissions.');
                return;
            }

            if (!speechModule.isRecognitionAvailable()) {
                setIsStarting(false);
                Alert.alert('Unavailable', 'Speech recognition is not available on this device.');
                return;
            }

            speechModule.start({
                lang: 'en-IN',
                interimResults: true,
                continuous: false,
                addsPunctuation: true,
                androidIntentOptions: {
                    // Uses Android's built-in SpeechRecognizer in free-form dictation mode.
                    EXTRA_LANGUAGE_MODEL: 'free_form',
                    EXTRA_PREFER_OFFLINE: true,
                },
                iosTaskHint: 'dictation',
            });
        } catch {
            setIsStarting(false);
            Alert.alert('Error', 'Unable to start voice recognition.');
        }
    };

    const handleStopListening = () => {
        speechModule?.stop();
    };

    useEffect(() => {
        if (autoStartTriedRef.current) return;
        if (!speechModule) return;

        autoStartTriedRef.current = true;
        handleStartListening();
    }, [speechModule]);

    useEffect(() => {
        if (speechModule) return;

        const timer = setTimeout(() => {
            transcriptInputRef.current?.focus();
        }, 250);

        return () => clearTimeout(timer);
    }, [speechModule]);

    const handleUseTransaction = () => {
        processTranscriptToTransaction(transcript, false);
    };

    const handleDone = () => {
        if (isRecognizing) {
            handleStopListening();
            return;
        }
        handleUseTransaction();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Voice Command</Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                        <View style={[styles.micCircle, { backgroundColor: isRecognizing ? theme.expense + '20' : theme.tint + '15' }]}>
                            {isStarting ? (
                                <ActivityIndicator color={theme.tint} />
                            ) : (
                                <Ionicons name={isRecognizing ? 'mic' : 'mic-outline'} size={36} color={isRecognizing ? theme.expense : theme.tint} />
                            )}
                        </View>
                        <Text style={[styles.heroTitle, { color: theme.text }]}>
                            {speechModule ? (isRecognizing ? 'Listening...' : 'Speak your transaction') : 'Describe your transaction'}
                        </Text>
                        <Text style={[styles.heroSubtitle, { color: theme.icon }]}>
                            {speechModule
                                ? 'Examples: “Spent 250 on lunch” or “Received 15000 salary”'
                                : 'Use your keyboard microphone or type something like “Spent 250 on lunch” or “Received 15000 salary”.'}
                        </Text>

                        <Pressable
                            style={[
                                styles.primaryButton,
                                {
                                    backgroundColor: isRecognizing ? theme.expense : theme.tint,
                                },
                            ]}
                            onPress={isRecognizing ? handleDone : handleStartListening}
                        >
                            <Text style={styles.primaryButtonText}>
                                {speechModule
                                    ? (isRecognizing ? 'Done' : 'Start Listening Again')
                                    : 'Use Keyboard Mic'}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                        <Text style={[styles.panelTitle, { color: theme.text }]}>Transcript</Text>
                        <TextInput
                            ref={transcriptInputRef}
                            value={transcript}
                            onChangeText={setTranscript}
                            multiline
                            autoFocus={!speechModule}
                            placeholder="Your spoken command will appear here. You can also type it manually."
                            placeholderTextColor={theme.icon}
                            style={[styles.transcriptInput, { color: theme.text, borderColor: theme.border }]}
                        />
                        {errorText ? <Text style={[styles.errorText, { color: theme.expense }]}>{errorText}</Text> : null}
                    </View>

                    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                        <Text style={[styles.panelTitle, { color: theme.text }]}>Detected Transaction</Text>
                        <Text style={[styles.detailText, { color: theme.text }]}>Type: {draft.type}</Text>
                        <Text style={[styles.detailText, { color: theme.text }]}>Title: {draft.title}</Text>
                        <Text style={[styles.detailText, { color: theme.text }]}>Amount: ₹{draft.amount?.toFixed(2) || '0.00'}</Text>
                        <Text style={[styles.detailText, { color: theme.text }]}>Category: {draft.category}</Text>

                        <Pressable style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: 16 }]} onPress={handleUseTransaction}>
                            <Text style={styles.primaryButtonText}>Use Transaction</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        gap: 18,
    },
    heroCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    micCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 18,
        lineHeight: 20,
    },
    panel: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 18,
    },
    panelTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    transcriptInput: {
        minHeight: 120,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
        textAlignVertical: 'top',
    },
    detailText: {
        fontSize: 15,
        marginBottom: 8,
    },
    primaryButton: {
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    errorText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: '500',
    },
});