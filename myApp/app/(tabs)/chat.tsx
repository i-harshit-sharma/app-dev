import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/context/TransactionContext';
import {
    ChatAssistantReply,
    ChatConversationTurn,
    ChatAssistantService,
    ChatInsightCard,
} from '@/services/ChatAssistantService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    insight?: ChatInsightCard;
};

const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const ChatBubble = ({ message, theme }: { message: ChatMessage; theme: typeof Colors.light }) => {
    const isUser = message.role === 'user';

    return (
        <Animated.View
            entering={FadeIn.duration(220)}
            style={[
                styles.bubbleContainer,
                isUser ? styles.userBubbleContainer : styles.aiBubbleContainer,
            ]}
        >
            {!isUser && (
                <View style={[styles.aiAvatar, { backgroundColor: theme.tint }]}>
                    <Ionicons name="sparkles" size={12} color="#FFF" />
                </View>
            )}

            <View style={styles.messageStack}>
                <View
                    style={[
                        styles.bubble,
                        isUser
                            ? { backgroundColor: theme.tint, borderBottomRightRadius: 6 }
                            : { backgroundColor: theme.card, borderTopLeftRadius: 6, borderWidth: 1, borderColor: theme.border },
                    ]}
                >
                    <Text style={[styles.messageText, isUser ? { color: '#FFF' } : { color: theme.text }]}>
                        {message.text}
                    </Text>
                </View>

                {!isUser && message.insight ? <InsightCard insight={message.insight} theme={theme} /> : null}
            </View>
        </Animated.View>
    );
};

const InsightCard = ({ insight, theme }: { insight: ChatInsightCard; theme: typeof Colors.light }) => {
    const toneMap = {
        blue: { background: currentAlpha(theme.tint, 0.12), icon: theme.tint },
        green: { background: currentAlpha(theme.income, 0.14), icon: theme.income },
        coral: { background: currentAlpha(theme.expense, 0.16), icon: theme.expense },
    } as const;

    const tone = toneMap[insight.tone || 'blue'];

    return (
        <View style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <View style={[styles.insightIconWrap, { backgroundColor: tone.background }]}>
                <Ionicons name="analytics" size={16} color={tone.icon} />
            </View>
            <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
                <Text style={[styles.insightValue, { color: tone.icon }]}>{insight.value}</Text>
                <Text style={[styles.insightCaption, { color: theme.icon }]}>{insight.caption}</Text>
            </View>
        </View>
    );
};

const SuggestionChips = ({ suggestions, onPress, theme }: { suggestions: string[]; onPress: (value: string) => void; theme: typeof Colors.light }) => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
            {suggestions.map((suggestion) => (
                <TouchableOpacity
                    key={suggestion}
                    style={[styles.suggestionChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => onPress(suggestion)}
                >
                    <Text style={[styles.suggestionText, { color: theme.text }]}>{suggestion}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const VoiceSheet = ({
    theme,
    value,
    onChange,
    onClose,
    onSubmit,
}: {
    theme: typeof Colors.light;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}) => {
    return (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(200)} style={styles.voiceOverlay}>
            <Animated.View entering={SlideInDown.duration(260)} exiting={SlideOutDown.duration(220)} style={styles.voiceSheetWrap}>
                <LinearGradient colors={[theme.tint, theme.emerald]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.voiceHero}>
                    <View style={styles.voiceHeroIcon}>
                        <Ionicons name="mic" size={26} color="#FFF" />
                    </View>
                    <Text style={styles.voiceTitle}>Ask with Your Voice</Text>
                    <Text style={styles.voiceSubtitle}>Use your keyboard microphone or type your question, then send it to FinVault AI.</Text>
                </LinearGradient>

                <View style={[styles.voiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <TextInput
                        value={value}
                        onChangeText={onChange}
                        multiline
                        autoFocus
                        placeholder="Example: Where am I overspending this month?"
                        placeholderTextColor={theme.icon}
                        style={[styles.voiceInput, { color: theme.text, borderColor: theme.border }]}
                    />

                    <View style={styles.voiceActions}>
                        <TouchableOpacity style={[styles.voiceSecondaryButton, { borderColor: theme.border }]} onPress={onClose}>
                            <Text style={[styles.voiceSecondaryText, { color: theme.text }]}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.voicePrimaryButton, { backgroundColor: theme.tint }]} onPress={onSubmit}>
                            <Text style={styles.voicePrimaryText}>Ask FinVault AI</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

function currentAlpha(hex: string, alpha: number) {
    if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
        return hex;
    }
    if (hex.length === 4) {
        const [_, r, g, b] = hex;
        return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}, ${alpha})`;
    }
    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function ChatScreen() {
    const { user } = useAuth();
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const { transactions, netWorth, financialPlan, goals, getMonthlySummary, getOverallSummary } = useTransactions();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [voiceInput, setVoiceInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isChatMode, setIsChatMode] = useState(false);
    const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
    const scrollRef = useRef<ScrollView>(null);

    const resetToIntro = () => {
        const welcome = ChatAssistantService.getWelcomeReply(assistantContext);
        setMessages([
            {
                id: createId(),
                role: 'assistant',
                text: welcome.text,
                insight: welcome.insight,
            },
        ]);
        setActiveSuggestions(welcome.suggestions || suggestedPrompts);
        setInput('');
        setVoiceInput('');
        setIsThinking(false);
        setIsVoiceMode(false);
        setIsChatMode(false);
    };

    const assistantContext = useMemo(
        () => ({
            user,
            netWorth,
            financialPlan,
            goals,
            transactions,
            monthlySummary: getMonthlySummary(new Date()),
            overallSummary: getOverallSummary(),
        }),
        [financialPlan, getMonthlySummary, getOverallSummary, goals, netWorth, transactions, user]
    );

    const suggestedPrompts = useMemo(
        () => ChatAssistantService.getSuggestedPrompts(assistantContext),
        [assistantContext]
    );

    useEffect(() => {
        setActiveSuggestions(suggestedPrompts);
    }, [suggestedPrompts]);

    useEffect(() => {
        if (messages.length > 0) {
            return;
        }

        const welcome = ChatAssistantService.getWelcomeReply(assistantContext);
        setMessages([
            {
                id: createId(),
                role: 'assistant',
                text: welcome.text,
                insight: welcome.insight,
            },
        ]);
        setActiveSuggestions(welcome.suggestions || suggestedPrompts);
    }, [assistantContext, messages.length, suggestedPrompts]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
        return () => clearTimeout(timeout);
    }, [messages, isThinking]);

    const submitQuestion = async (question: string, source: 'typed' | 'suggested' = 'typed') => {
        const cleanQuestion = question.trim();
        if (!cleanQuestion || isThinking) {
            return;
        }

        const history: ChatConversationTurn[] = messages
            .slice(-10)
            .map((message) => ({ role: message.role, text: message.text }));

        setMessages((current) => [
            ...current,
            {
                id: createId(),
                role: 'user',
                text: cleanQuestion,
            },
        ]);
        setInput('');
        setVoiceInput('');
        setIsVoiceMode(false);
        setIsThinking(true);
        setIsChatMode(true);
        requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        });

        const reply = source === 'suggested'
            ? ChatAssistantService.respondSuggested(cleanQuestion, assistantContext)
            : await ChatAssistantService.respondTyped(cleanQuestion, assistantContext, history);

        setMessages((current) => [
            ...current,
            {
                id: createId(),
                role: 'assistant',
                text: reply.text,
                insight: reply.insight,
            },
        ]);
        setActiveSuggestions(reply.suggestions || suggestedPrompts);
        setIsThinking(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentTheme === 'dark' ? theme.background : '#F6FAFD' }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
                {!isChatMode ? (
                    <LinearGradient
                        colors={currentTheme === 'dark' ? ['#18212F', '#101827'] : ['#E8F4FF', '#F7FBFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.heroCard, { borderColor: theme.border }]}
                    >
                        <View style={styles.heroTopRow}>
                            <View>
                                <Text style={[styles.heroEyebrow, { color: theme.tint }]}>AI Chat</Text>
                                <Text style={[styles.heroTitle, { color: theme.text }]}>FinVault AI</Text>
                                <Text style={[styles.heroSubtitle, { color: theme.icon }]}>Ask questions about spending, budget pacing, savings, goals, and recent transactions.</Text>
                            </View>
                            <View style={[styles.heroBadge, { backgroundColor: currentTheme === 'dark' ? '#243042' : '#FFFFFF' }]}>
                                <Text style={styles.heroBadgeLabel}>Profile</Text>
                                <Text style={[styles.heroBadgeValue, { color: theme.text }]}>{user?.name?.split(' ')[0] || 'Guest'}</Text>
                            </View>
                        </View>
                        <SuggestionChips suggestions={activeSuggestions} onPress={(value) => submitQuestion(value, 'suggested')} theme={theme} />
                    </LinearGradient>
                ) : null}

                <ScrollView
                    ref={scrollRef}
                    style={styles.chatStream}
                    contentContainerStyle={[
                        styles.chatContent,
                        isChatMode ? styles.chatContentInSession : undefined,
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {messages.map((message) => (
                        <ChatBubble key={message.id} message={message} theme={theme} />
                    ))}

                    {isThinking ? (
                        <View style={styles.thinkingRow}>
                            <View style={[styles.aiAvatar, { backgroundColor: theme.tint }]}>
                                <Ionicons name="sparkles" size={12} color="#FFF" />
                            </View>
                            <View style={[styles.thinkingBubble, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                                <ActivityIndicator size="small" color={theme.tint} />
                                <Text style={[styles.thinkingText, { color: theme.icon }]}>Analyzing your finances...</Text>
                            </View>
                        </View>
                    ) : null}
                </ScrollView>

                <View style={[styles.inputShell, { backgroundColor: theme.background, borderTopColor: theme.border }]}> 
                    {!isChatMode ? (
                        <View style={styles.inputHintRow}>
                            <Ionicons name="sparkles-outline" size={14} color={theme.tint} />
                            <Text style={[styles.inputHintText, { color: theme.icon }]}>Ask in plain language, or use the voice-style input sheet.</Text>
                        </View>
                    ) : (
                        <View style={styles.chatModeHeader}>
                            <Text style={[styles.chatModeLabel, { color: theme.icon }]}>Chat mode</Text>
                            <TouchableOpacity
                                style={[styles.backoutButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                                onPress={() => {
                                    if (isThinking) {
                                        return;
                                    }
                                    Alert.alert(
                                        'Back out of chat?',
                                        'This will close the current chat thread and return to FinVault AI starter prompts.',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Back Out', style: 'destructive', onPress: resetToIntro },
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="arrow-undo" size={14} color={theme.text} />
                                <Text style={[styles.backoutText, { color: theme.text }]}>Back out</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                            <TextInput
                                placeholder="Ask about your budget, spending, or runway..."
                                placeholderTextColor={theme.icon}
                                style={[styles.input, { color: theme.text }]}
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={() => submitQuestion(input, 'typed')}
                                blurOnSubmit={false}
                                returnKeyType="send"
                                onFocus={() => {
                                    requestAnimationFrame(() => {
                                        scrollRef.current?.scrollToEnd({ animated: true });
                                    });
                                }}
                            />
                            <TouchableOpacity onPress={() => submitQuestion(input, 'typed')}>
                                <Ionicons name="arrow-up-circle" size={32} color={input.trim() ? theme.tint : theme.icon} style={{ opacity: input.trim() ? 1 : 0.35 }} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.micButton, { backgroundColor: theme.background, shadowColor: theme.tint }]}
                            onPress={() => setIsVoiceMode(true)}
                        >
                            <LinearGradient colors={[theme.tint, theme.emerald]} style={styles.micGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <Ionicons name="mic" size={22} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {isVoiceMode ? (
                <VoiceSheet
                    theme={theme}
                    value={voiceInput}
                    onChange={setVoiceInput}
                    onClose={() => setIsVoiceMode(false)}
                    onSubmit={() => submitQuestion(voiceInput, 'typed')}
                />
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroCard: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    heroEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 4,
    },
    heroSubtitle: {
        fontSize: 13,
        lineHeight: 19,
        maxWidth: 240,
        fontWeight: '500',
    },
    heroBadge: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    heroBadgeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#667085',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    heroBadgeValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    suggestionRow: {
        gap: 10,
        paddingRight: 4,
    },
    suggestionChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        borderWidth: 1,
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chatStream: {
        flex: 1,
    },
    chatContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 140,
    },
    chatContentInSession: {
        paddingTop: 14,
    },
    bubbleContainer: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-end',
    },
    userBubbleContainer: {
        justifyContent: 'flex-end',
    },
    aiBubbleContainer: {
        justifyContent: 'flex-start',
    },
    aiAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginBottom: 4,
    },
    messageStack: {
        maxWidth: '82%',
    },
    bubble: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
    insightCard: {
        marginTop: 8,
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    insightIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    insightValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2,
    },
    insightCaption: {
        fontSize: 12,
        fontWeight: '600',
    },
    thinkingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    thinkingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    thinkingText: {
        fontSize: 13,
        fontWeight: '600',
    },
    inputShell: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 14,
        borderTopWidth: 1,
    },
    inputHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 12,
    },
    inputHintText: {
        fontSize: 12,
        fontWeight: '500',
    },
    chatModeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    chatModeLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    backoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    backoutText: {
        fontSize: 12,
        fontWeight: '700',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 54,
        borderRadius: 27,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 15,
        minHeight: 52,
    },
    micButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 5,
    },
    micGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 12, 24, 0.55)',
        justifyContent: 'flex-end',
    },
    voiceSheetWrap: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    voiceHero: {
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 28,
        alignItems: 'center',
    },
    voiceHeroIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    voiceTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 6,
    },
    voiceSubtitle: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 280,
        fontWeight: '500',
    },
    voiceCard: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        padding: 20,
        marginTop: -10,
    },
    voiceInput: {
        minHeight: 130,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 15,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    voiceActions: {
        flexDirection: 'row',
        gap: 12,
    },
    voiceSecondaryButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceSecondaryText: {
        fontSize: 15,
        fontWeight: '700',
    },
    voicePrimaryButton: {
        flex: 1.2,
        minHeight: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    voicePrimaryText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
});