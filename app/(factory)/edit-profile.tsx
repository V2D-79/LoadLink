/**
 * app/(factory)/edit-profile.tsx
 *
 * Edit factory profile with all database fields
 * - Upload/change profile picture (converts to base64)
 * - Edit organization and contact information
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
import { DB_PATHS } from '../../src/constants/app';

export default function EditFactoryProfileScreen() {
  const { firebaseUser, userProfile } = useAuthContext();
  const router = useRouter();
  const uid = firebaseUser?.uid;

  // Form state
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [language, setLanguage] = useState('en');

  // Load current data
  useEffect(() => {
    if (!uid) return;
    
    const loadData = async () => {
      const db = getFirebaseDB();
      
      // Load public profile
      const publicSnap = await get(ref(db, `${DB_PATHS.users}/${uid}`));
      if (publicSnap.exists()) {
        const data = publicSnap.val();
        setOrgName(data.orgName || '');
        setDisplayName(data.displayName || data.fullName || '');
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
        setGstNumber(data.gstNumber || '');
        setBusinessAddress(data.businessAddress || '');
      }
    };
    
    loadData();
  }, [uid]);

  const pickImage = async () => {
    console.log('[EditFactoryProfile] Requesting media library permissions...');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload a profile picture.');
      return;
    }

    console.log('[EditFactoryProfile] Launching image picker...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('[EditFactoryProfile] Image selected, converting to base64...');
      await convertImageToBase64(result.assets[0].uri);
    }
  };

  const convertImageToBase64 = async (uri: string) => {
    try {
      setLoading(true);
      
      // Resize image to max 400x400 to keep base64 size reasonable
      console.log('[EditFactoryProfile] Resizing image...');
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (manipResult.base64) {
        const base64String = `data:image/jpeg;base64,${manipResult.base64}`;
        console.log('[EditFactoryProfile] Image converted, size:', base64String.length, 'characters');
        setProfileImage(base64String);
      }
    } catch (error) {
      console.error('[EditFactoryProfile] Error converting image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!uid) return;
    
    // Basic validation
    if (!orgName.trim()) {
      Alert.alert('Validation Error', 'Organization name is required.');
      return;
    }
    
    console.log('[EditFactoryProfile] Saving profile changes...');
    setLoading(true);

    try {
      const db = getFirebaseDB();
      
      // Update public profile
      console.log('[EditFactoryProfile] Updating public profile...');
      await update(ref(db, `${DB_PATHS.users}/${uid}`), {
        orgName: orgName.trim(),
        displayName: displayName.trim() || orgName.trim(),
        fullName: displayName.trim() || orgName.trim(),
        phone,
        whatsapp: whatsapp || null,
        city,
        state,
        language,
        profileImageUrl: profileImage || null,
      });
      
      // Update private profile
      console.log('[EditFactoryProfile] Updating private profile...');
      await update(ref(db, `${DB_PATHS.userPrivate}/${uid}`), {
        realEmail: email.trim() || null,
        gstNumber: gstNumber.trim() || null,
        businessAddress: businessAddress.trim() || null,
      });
      
      console.log('[EditFactoryProfile] Profile updated successfully!');
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('[EditFactoryProfile] Error saving profile:', error);
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
                  {orgName.charAt(0).toUpperCase() || displayName.charAt(0).toUpperCase() || 'F'}
                </Text>
              </View>
            )}
            <View style={s.cameraIcon}>
              <Text style={s.cameraEmoji}>📷</Text>
            </View>
          </Pressable>
          
          <Text style={s.avatarHint}>Tap to change profile picture</Text>
        </Card>

        {/* Organization Information */}
        <Card style={s.section}>
          <Text style={s.sectionTitle}>Organization Information</Text>
          
          <Input
            label="Organization Name *"
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Enter your company name"
          />
          
          <Input
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name or company name"
          />
          
          <Input
            label="GST Number (Optional)"
            value={gstNumber}
            onChangeText={setGstNumber}
            placeholder="e.g., 27AABCU9603R1ZM"
            autoCapitalize="characters"
            maxLength={15}
          />
          
          <Input
            label="Business Address (Optional)"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="Enter your business address"
            multiline
            numberOfLines={3}
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

        {/* Contact Information */}
        <Card style={s.section}>
          <Text style={s.sectionTitle}>Contact Information</Text>
          
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
    backgroundColor: COLORS.rust,
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
});
