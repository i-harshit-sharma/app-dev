import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useMemo, useState, useRef } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { OcrService } from "@/services/OcrService";
import { AddTransactionDraft } from "@/services/ParserService";

export default function OcrCameraScreen() {
    const router = useRouter();
    const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [draft, setDraft] = useState<AddTransactionDraft | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const hasOpenedRef = useRef(false);

    const canUseCamera = useMemo(() => Platform.OS !== "web", []);

    const runOcr = useCallback(async (uri: string) => {
        setIsProcessing(true);
        setErrorMessage(null);
        setDraft(null);

        try {
            const { draft: nextDraft, error } = await OcrService.parseImageToTransaction(uri);
            if (nextDraft) {
                setDraft(nextDraft);
            } else {
                setErrorMessage(error || "Could not extract transaction details from this receipt.");
            }
        } catch (error) {
            console.error("OCR Error: ", error);
            setErrorMessage("Network error. Please check your internet connection.");
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleUseTransaction = useCallback(() => {
        if (!draft?.amount) return;

        router.replace({
            pathname: "/add-transaction",
            params: {
                amount: draft.amount.toString(),
                title: draft.title,
                category: draft.category,
                type: draft.type,
                method: draft.method,
                date: draft.date.toISOString(),
                notes: draft.notes,
                returnTo: returnTo || '/(tabs)/index',
            },
        });
    }, [draft, returnTo, router]);

    const captureImage = useCallback(async () => {
        setErrorMessage(null);

        if (!canUseCamera) {
            setErrorMessage("Camera is not available on web.");
            return;
        }

        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            setErrorMessage("Camera permission is required.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8, // Reduced slightly for better performance
            allowsEditing: true, // Cropping helps OCR accuracy significantly
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            const uri = result.assets[0].uri;
            setImageUri(uri);
            // Small delay to allow UI to update before heavy OCR processing
            setTimeout(() => runOcr(uri), 500);
        }
    }, [canUseCamera, runOcr]);

    useFocusEffect(
        useCallback(() => {
            // Auto-open camera when screen is focused, but only if we haven't done it yet this session
            // and surely not if we already have an image.
            if (!hasOpenedRef.current && !imageUri) {
                hasOpenedRef.current = true;
                // Small delay to ensure transition animation finishes
                setTimeout(() => {
                    captureImage();
                }, 500);
            }
        }, [captureImage, imageUri])
    );

    return (
        <>
            <Stack.Screen options={{ title: "OCR Camera", headerBackTitle: "Back" }} />
            <ParallaxScrollView
                headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
                headerImage={
                    <View style={styles.headerContent}>
                        {imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.previewImage}
                                contentFit="contain"
                            />
                        ) : (
                            <View style={styles.placeholderHeader}>
                                <ThemedText>No Image Captured</ThemedText>
                            </View>
                        )}
                    </View>
                }
            >
                <ThemedView style={styles.titleContainer}>
                    <ThemedText type="title">Scan Receipt</ThemedText>
                </ThemedView>

                <ThemedView style={styles.stepContainer}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.captureButton,
                            pressed && styles.captureButtonPressed,
                            isProcessing && { backgroundColor: "#ccc" },
                        ]}
                        onPress={captureImage}
                        disabled={isProcessing}
                    >
                        <ThemedText type="defaultSemiBold" style={styles.captureButtonText}>
                            {isProcessing ? "Processing receipt..." : "Take Photo"}
                        </ThemedText>
                    </Pressable>
                </ThemedView>

                <ThemedView style={styles.outputContainer}>
                    <ThemedText type="subtitle">Detected Transaction</ThemedText>
                    {errorMessage ? (
                        <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                    ) : isProcessing ? (
                        <ThemedText style={styles.ocrResultText}>Reading receipt and preparing transaction...</ThemedText>
                    ) : draft ? (
                        <>
                            <ThemedText style={styles.ocrResultText}>Title: {draft.title}</ThemedText>
                            <ThemedText style={styles.ocrResultText}>Amount: ₹{draft.amount?.toFixed(2) || '0.00'}</ThemedText>
                            <ThemedText style={styles.ocrResultText}>Type: {draft.type}</ThemedText>
                            <ThemedText style={styles.ocrResultText}>Category: {draft.category}</ThemedText>
                            <View style={styles.actionsRow}>
                                <Pressable
                                    style={({ pressed }) => [styles.captureButton, styles.secondaryButton, pressed && styles.captureButtonPressed]}
                                    onPress={captureImage}
                                >
                                    <ThemedText type="defaultSemiBold" style={styles.captureButtonText}>Retake</ThemedText>
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}
                                    onPress={handleUseTransaction}
                                >
                                    <ThemedText type="defaultSemiBold" style={styles.captureButtonText}>Use Transaction</ThemedText>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <ThemedText style={styles.ocrResultText}>Take a photo to detect transaction details.</ThemedText>
                    )}
                </ThemedView>
            </ParallaxScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    stepContainer: { gap: 8, marginBottom: 16 },
    outputContainer: {
        gap: 8,
        padding: 10,
        backgroundColor: "rgba(0,0,0,0.05)",
        borderRadius: 8,
    },
    headerContent: {
        height: 220,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    previewImage: { height: "100%", width: "100%" },
    placeholderHeader: { height: 200, justifyContent: "center" },
    captureButton: {
        borderRadius: 12,
        backgroundColor: "#2F7CF6",
        paddingVertical: 16,
        alignItems: "center",
        flex: 1,
    },
    captureButtonPressed: { opacity: 0.8 },
    captureButtonText: { color: "#FFFFFF", fontSize: 18 },
    actionsRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 12,
    },
    secondaryButton: {
        backgroundColor: "#607D8B",
    },
    errorText: { color: "#D9534F" },
    ocrResultText: { fontSize: 16, lineHeight: 24 },
});