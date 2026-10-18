/**
 * app/(driver)/edit-profile.tsx
 *
 * Edit driver profile with all database fields
 * - Upload/change profile picture (converts to base64)
 * - Edit personal information
 * - Edit truck details
 * - Save changes to Firebase RTDB
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, update, get } from 'firebase/database';

import { getFirebaseDB } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { Input, Button, Card } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS, VEHICLE_TYPE_LABELS, BODY_TYPE_LABELS } from '../../src/constants/app';

export default function EditDriverProfileScreen() {
  const { firebaseUser, userProfile } = useAuthContext();
  const router = useRouter();
  const uid = firebaseUser?.uid;

  // Form state
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [language, setLanguage] = useState('en');
  
  // Truck details
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('medium_truck');
  const [bodyType, setBodyType] = useState('open');
  const [maxCapacity, setMaxCapacity] = useState('');
  
  // Private data
  const [primaryTruckId, setPrimaryTruckId] = useState('');

  // Load current data
  useEffect(() => {
    if (!uid) return;
    
    const loadData = async () => {
      const db = getFirebaseDB();
      
      // Load public profile
      const publicSnap = await get(ref(db, `${DB_PATHS.users}/${uid}`));
      if (publicSnap.exists()) {
        const data = publicSnap.val();
        setDisplayName(data.displayName || '');
        setPhone(data.phone || '');
        setWhatsapp(data.whatsapp || '');
        setCity(data.city || '');
        setState(data.state || '');
        setLanguage(data.language || 'en');
        setProfileImage(data.profileImageUrl || null);
      }
      
      // Load private profile
      const privateSnap = await get(ref(db, `${DB_PATHS.userPrivate}/${uid}`));
      if (privateSnap.exists()) {
        const data = privateSnap.val();
        setEmail(data.realEmail || data.internalEmail || '');
        setPrimaryTruckId(data.primaryTruckId || '');
      }
      
      // Load truck data
      if (primaryTruckId) {
        const truckSnap = await get(ref(db, `${DB_PATHS.trucks}/${uid}/${primaryTruckId}`));
        if (truckSnap.exists()) {
          const truck = truckSnap.val();
          setRegistrationNumber(truck.registrationNumber || '');
          setVehicleType(truck.vehicleType || 'medium_truck');
          setBodyType(truck.bodyType || 'open');
          setMaxCapacity(truck.maxCapacityTonnes?.toString() || '');
        }
      }
    };
    
    loadData();
  }, [uid, primaryTruckId]);

  const pickImage = async () => {
    console.log('[EditProfile] Requesting media library permissions...');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload a profile picture.');
      return;
    }

    console.log('[EditProfile] Launching image picker...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('[EditProfile] Image selected, converting to base64...');
      await convertImageToBase64(result.assets[0].uri);
    }
  };

  const convertImageToBase64 = async (uri: string) => {
    try {
      setLoading(true);
      
      // Resize image to max 400x400 to keep base64 size reasonable
      console.log('[EditProfile] Resizing image...');
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (manipResult.base64) {
        const base64String = `data:image/jpeg;base64,${manipResult.base64}`;
        console.log('[EditProfile] Image converted, size:', base64String.length, 'characters');
        setProfileImage(base64String);
      }
    } catch (error) {
      console.error('[EditProfile] Error converting image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!uid) return;
    
    console.log('[EditProfile] Saving profile changes...');
    setLoading(true);

    try {
      const db = getFirebaseDB();
      
      // Update public profile
      console.log('[EditProfile] Updating public profile...');
      await update(ref(db, `${DB_PATHS.users}/${uid}`), {
        displayName,
        phone,
        whatsapp: whatsapp || null,
        city,
        state,
        language,
        profileImageUrl: profileImage || null,
      });
      
      // Update private profile (email)
      if (email) {
        console.log('[EditProfile] Updating email in private profile...');
        await update(ref(db, `${DB_PATHS.userPrivate}/${uid}`), {
          realEmail: email.trim(),
        });
      }
      
      // Update truck if primaryTruckId exists
      if (primaryTruckId && maxCapacity) {
        console.log('[EditProfile] Updating truck details...');
        await update(ref(db, `${DB_PATHS.trucks}/${uid}/${primaryTruckId}`), {
          registrationNumber,
          vehicleType,
          bodyType,
          maxCapacityTonnes: parseFloat(maxCapacity),
        });
      }
      
      console.log('[EditProfile] Profile updated successfully!');
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('[EditProfile] Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Profile Picture */}
        <Card style={s.section}>
          <Text style={s.sectionTitle}>Profile Picture</Text>
          
          <Pressable onPress={pickImage} style={s.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>
                  {displayName.charAt(0).toUpperCase() || 'D'}
                </Text>
              </View>
            )}
            <View style={s.cameraIcon}>
              <Text style={s.cameraEmoji}>📷</Text>
            </View>
          </Pressable>
          
          <Text style={s.avatarHint}>Tap to change profile picture</Text>
        </Card>

        {/* Personal Information */}
        <Card style={s.section}>
          <Text style={s.sectionTitle}>Personal Information</Text>
          
          <Input
            label="Full Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your full name"
          />
          
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g., 9876543210"
            keyboardType="phone-pad"
            maxLength={13}
          />
          
          <Input
            label="WhatsApp Number (Optional)"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="e.g., 9876543210"
            keyboardType="phone-pad"
            maxLength={13}
          />
          
          <Input
            label="Email (Optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Input
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="e.g., Mumbai"
          />
          
          <Input
            label="State"
            value={state}
            onChangeText={setState}
            placeholder="e.g., Maharashtra"
          />
        </Card>

        {/* Truck Details */}
        <Card style={s.section}>
          <Text style={s.sectionTitle}>Truck Details</Text>
          
          <Input
            label="Registration Number"
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder="e.g., MH12AB1234"
            autoCapitalize="characters"
            maxLength={12}
          />
          
          <Input
            label="Maximum Capacity (Tonnes)"
            value={maxCapacity}
            onChangeText={setMaxCapacity}
            placeholder="e.g., 10"
            keyboardType="decimal-pad"
          />
          
          <Text style={s.infoText}>
            Vehicle Type: {VEHICLE_TYPE_LABELS[vehicleType as keyof typeof VEHICLE_TYPE_LABELS]}
          </Text>
          <Text style={s.infoText}>
            Body Type: {BODY_TYPE_LABELS[bodyType as keyof typeof BODY_TYPE_LABELS]}
          </Text>
        </Card>

        {/* Save Button */}
        <Button
          title={loading ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          variant="primary"
          size="lg"
          disabled={loading}
          fullWidth
          style={{ marginTop: SPACING.md }}
        />
        
        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="outline"
          size="lg"
          fullWidth
          style={{ marginTop: SPACING.sm }}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.paperWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  backBtn: { padding: SPACING.xxs },
  backArrow: { fontSize: 24, color: COLORS.charcoal },
  headerTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.charcoal,
  },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  section: { padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.charcoal,
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.xs,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.hairline,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.ochre,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.headingBold,
    fontSize: 48,
    color: COLORS.paperWhite,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.ochre,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.paperWhite,
  },
  cameraEmoji: { fontSize: 18 },
  avatarHint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    marginBottom: SPACING.xxs,
  },
});
