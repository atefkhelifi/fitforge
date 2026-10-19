import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Label } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { deletePhoto, listPhotos, uploadPhoto } from '@/features/photos/api';
import { Angle, angles, comparePair, daysBetween, Photo } from '@/lib/photos';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

export function PhotosTab() {
  const styles = useStyles();
  const colors = useColors();
  const { configured, session } = useAuth();
  const userId = session?.user.id;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [angle, setAngle] = useState<Angle>('front');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const key = `${userId}:${reload}`;
  const loading = !!userId && loadedKey !== key;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listPhotos()
      .then((list) => {
        if (!cancelled) {
          setPhotos(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load photos.');
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, key]);

  const add = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera permission is needed to take a photo. You can choose one from your gallery instead.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      setBusy(true);
      await uploadPhoto(result.assets[0].uri, angle);
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the photo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photo: Photo) => {
    if (confirmId !== photo.id) {
      setConfirmId(photo.id);
      return;
    }
    setConfirmId(null);
    setBusy(true);
    try {
      await deletePhoto(photo);
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the photo.');
    } finally {
      setBusy(false);
    }
  };

  if (!configured || !session) {
    return (
      <Card style={{ gap: 8 }}>
        <Label>SIGN IN REQUIRED</Label>
        <Text style={styles.muted}>
          {configured
            ? 'Progress photos are stored privately in your account. Sign in from the Profile tab to add and view them.'
            : 'Progress photos need Supabase. Add your keys to .env first (see the Profile tab).'}
        </Text>
      </Card>
    );
  }

  const pair = comparePair(photos, angle);

  return (
    <>
      <Card style={{ gap: 12 }}>
        <Label>ADD A PHOTO</Label>
        <View style={styles.row}>
          {angles.map((a) => (
            <Pressable
              key={a.value}
              accessibilityRole="button"
              accessibilityState={{ selected: a.value === angle }}
              onPress={() => setAngle(a.value)}
              style={[styles.chip, a.value === angle && { backgroundColor: colors.primary }]}>
              <Text style={[styles.chipText, a.value === angle && { color: colors.onPrimary }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => add('camera')} style={[styles.button, { flex: 1 }]}>
            <Text style={styles.buttonText}>Take photo</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => add('library')} style={[styles.button, { flex: 1 }]}>
            <Text style={styles.buttonText}>Gallery</Text>
          </Pressable>
        </View>
        {(busy || loading) && <ActivityIndicator color={colors.primary} />}
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.muted}>Photos are private to your account. Use the same pose, light and distance each time for a fair comparison.</Text>
      </Card>

      {pair && (
        <Card style={{ gap: 10 }}>
          <View style={styles.head}>
            <Text style={styles.title}>Before and after</Text>
            <Text style={styles.muted}>{daysBetween(pair.before.date, pair.after.date)} days apart</Text>
          </View>
          <View style={styles.row}>
            {[pair.before, pair.after].map((p, i) => (
              <View key={p.id} style={{ flex: 1, gap: 6 }}>
                <Image source={{ uri: p.url }} style={styles.compareImage} accessibilityLabel={`${i === 0 ? 'Before' : 'After'} photo, ${p.angle}, ${p.date}`} />
                <Text style={styles.caption}>{p.date}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {photos.length === 0 && !loading ? (
        <Card style={{ gap: 8 }}>
          <Label>NO PHOTOS YET</Label>
          <Text style={styles.muted}>Add your first photo above. After a second one of the same angle you get a before and after view.</Text>
        </Card>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <View key={p.id} style={styles.tile}>
              <Image source={{ uri: p.url }} style={styles.thumb} accessibilityLabel={`${p.angle} photo from ${p.date}`} />
              <Text style={styles.caption}>
                {p.date} · {p.angle}
              </Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(p)} style={styles.delete}>
                <Text style={[styles.deleteText, confirmId === p.id && { color: colors.danger }]}>{confirmId === p.id ? 'Tap again to delete' : 'Delete'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 19 },
    error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
    row: { flexDirection: 'row', gap: 10 },
    head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    title: { color: colors.text, fontSize: 14, fontWeight: '800' },
    chip: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    chipText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    button: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
    compareImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surface2 },
    caption: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: { flexBasis: '47%', flexGrow: 1, gap: 6 },
    thumb: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surface2 },
    delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    deleteText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  }),
);
