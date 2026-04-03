import { useAuth } from '@clerk/clerk-expo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';

import { API_BASE_URL } from '../../constants/api';

export default function ScannerScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');

  // ── Camera not ready yet ───────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Camera access is required to scan receipts.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Upload image (camera or gallery) to backend ─────────────────────────────
  const uploadImage = async (uri: string) => {
    try {
      setScanning(true);

      const token = await getToken();
      if (!token) throw new Error('Authentication token unavailable. Please sign in again.');

      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: `receipt_${Date.now()}.jpg`,
      } as any);

      const response = await fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `Server error ${response.status}`);
      }

      router.push({
        pathname: '/(app)/results',
        params: {
          id: json.data.id,
          merchantName: json.data.merchantName,
          totalAmount: String(json.data.totalAmount),
          date: json.data.date,
          category: json.data.category,
          imageUri: uri,
        },
      });
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // ── Capture from camera ─────────────────────────────────────────────────────
  const captureAndScan = async () => {
    if (!cameraRef.current || scanning) return;


    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });

    if (!photo?.uri) {
      Alert.alert('Error', 'Failed to capture photo.');
      return;
    }

    await uploadImage(photo.uri);
  };

  // ── Pick from gallery ─────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    if (scanning) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadImage(result.assets[0].uri);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Live camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashMode === 'on'}
        flash={flashMode}
      />

      {/* Vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* UI Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={[styles.iconBtn, flashMode === 'on' && styles.iconBtnActive]}
              onPress={() => setFlashMode(f => f === 'off' ? 'on' : 'off')}
            >
              <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-outline'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Viewfinder guide */}
        <View style={styles.viewfinderArea}>
          {scanning && (
            <View style={styles.scanLine} />
          )}

          <View style={styles.guideBox}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {!scanning && (
              <View style={styles.hintInner}>
                <Text style={styles.hintTitle}>Align Receipt Here</Text>
                <Text style={styles.hintSubtitle}>Ensure all four corners are visible</Text>
              </View>
            )}
            {scanning && (
              <View style={styles.hintInner}>
                <ActivityIndicator color={Colors['primary-fixed-dim']} size="large" />
                <Text style={[styles.hintTitle, { marginTop: 12 }]}>Analyzing…</Text>
                <Text style={styles.hintSubtitle}>Our AI is extracting receipt data</Text>
              </View>
            )}
          </View>

          <View style={styles.hintBadge}>
            <Ionicons name="sparkles" size={14} color={Colors['primary-fixed']} style={{ marginRight: 6 }} />
            <Text style={styles.hintBadgeText}>Powered by Gemini AI</Text>
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {/* Gallery button */}
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={pickFromGallery}
            disabled={scanning}
            activeOpacity={0.7}
          >
            <Ionicons name="images" size={20} color="rgba(255,255,255,0.8)" style={{ marginBottom: 2 }} />
            <Text style={styles.galleryLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            style={styles.shutter}
            onPress={captureAndScan}
            disabled={scanning}
            activeOpacity={0.85}
          >
            <View style={[styles.shutterInner, scanning && { backgroundColor: Colors.primary }]} />
          </TouchableOpacity>

          {/* Flash label */}
          <View style={styles.modeBtn}>
            <Ionicons name="flash" size={12} color="rgba(255,255,255,0.8)" style={{ marginBottom: 2 }} />
            <Text style={styles.modeIcon}>
              {flashMode === 'on' ? 'On' : 'Off'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24 },
  overlay: { flex: 1 },
  vignette: { ...StyleSheet.absoluteFillObject },

  permissionText: { fontSize: 16, fontFamily: Fonts.body, color: Colors['on-surface'], textAlign: 'center', marginBottom: 20 },
  permissionBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: Colors.primary, borderRadius: 16,
  },
  permissionBtnText: { color: '#fff', fontSize: 15, fontFamily: Fonts.headlineExtra },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 16,
  },
  topBarRight: { flexDirection: 'row', gap: 12 },
  iconBtn: {
    width: 46, height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: Colors.primary + 'CC',
  },
  iconBtnText: { fontSize: 18, fontFamily: Fonts.headline, color: '#fff' },

  viewfinderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scanLine: {
    position: 'absolute',
    left: 40, right: 40,
    height: 2, top: '30%',
    backgroundColor: Colors['primary-fixed-dim'],
    shadowColor: Colors['primary-fixed-dim'],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 10,
    zIndex: 10,
  },
  guideBox: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible',
  },

  corner: {
    position: 'absolute',
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: Colors['primary-fixed-dim'],
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 8 },

  hintInner: { alignItems: 'center', paddingHorizontal: 20 },
  hintTitle: { fontSize: 17, fontFamily: Fonts.headlineExtra, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  hintSubtitle: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: 'rgba(255,255,255,0.6)', marginTop: 6, textAlign: 'center' },

  hintBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: 'rgba(0,45,22,0.5)',
    borderRadius: 99,
    borderWidth: 1, borderColor: Colors['primary-fixed-dim'] + '50',
  },
  hintBadgeText: { fontSize: 11, fontFamily: Fonts.label, color: Colors['primary-fixed'], letterSpacing: 1.2, textTransform: 'uppercase' },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingBottom: 40, paddingTop: 20,
  },
  galleryBtn: {
    width: 58, height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    gap: 2,
  },
  galleryIcon: { fontSize: 20 },
  galleryLabel: { fontSize: 8, fontFamily: Fonts.label, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  shutter: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 4, borderColor: '#fff',
    padding: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    flex: 1, borderRadius: 34,
    backgroundColor: '#fff',
    width: '100%',
  },
  modeBtn: {
    width: 58, height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  modeIcon: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.label },
});
