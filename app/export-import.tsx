import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

import { getDb } from '../db/database';
import { exportExpensesCsv, exportFullBackupJson } from '../services/exportService';
import { restoreBackupData, wipeAllData, validateBackupData } from '../services/importService';
import { useThemeColor } from '../hooks/useThemeColor';
import { useDataStore } from '../store/dataStore';
import { Spacing, Radii, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';

export default function ExportImportScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();
  const bumpDataVersion = useDataStore((state) => state.bumpDataVersion);

  const [loading, setLoading] = useState(false);

  // 1. Export CSV
  const handleExportCsv = async () => {
    try {
      setLoading(true);
      const db = await getDb();
      await exportExpensesCsv(db, {});
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'CSV export failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Export Full JSON Backup
  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const db = await getDb();
      await exportFullBackupJson(db);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'Backup export failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Restore JSON Backup
  const handlePickAndRestoreBackup = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const fileUri = pickerResult.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      let parsedData: any;

      try {
        parsedData = JSON.parse(fileContent);
      } catch {
        Alert.alert(Strings.common.error, Strings.exportImport.importErrorInvalid);
        return;
      }

      const validation = validateBackupData(parsedData);
      if (!validation.valid) {
        Alert.alert(Strings.common.error, validation.error || Strings.exportImport.importErrorInvalid);
        return;
      }

      // Prompt for Merge vs Replace
      Alert.alert(
        Strings.exportImport.importModeTitle,
        'How would you like to restore this backup?',
        [
          { text: Strings.common.cancel, style: 'cancel' },
          {
            text: Strings.exportImport.importMerge,
            onPress: () => performRestore(parsedData, 'merge'),
          },
          {
            text: Strings.exportImport.importReplace,
            style: 'destructive',
            onPress: () => performRestore(parsedData, 'replace'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'Error restoring backup.');
    }
  };

  const performRestore = async (data: any, mode: 'merge' | 'replace') => {
    try {
      setLoading(true);
      const db = await getDb();
      const result = await restoreBackupData(db, data, mode);

      if (result.success) {
        bumpDataVersion();
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert(
          Strings.common.success,
          `${Strings.exportImport.importSuccess} (${result.importedExpensesCount} expenses restored).`
        );
      } else {
        Alert.alert(Strings.common.error, result.error || 'Restore failed.');
      }
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'Restore failed.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Wipe All Data (Double Confirmation)
  const handleWipeData = () => {
    Alert.alert(
      Strings.exportImport.deleteAllData,
      Strings.exportImport.deleteAllFirstConfirm,
      [
        { text: Strings.common.cancel, style: 'cancel' },
        {
          text: Strings.common.delete,
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Warning',
              Strings.exportImport.deleteAllSecondConfirm,
              [
                { text: Strings.common.cancel, style: 'cancel' },
                {
                  text: 'Permanently Wipe Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setLoading(true);
                      const db = await getDb();
                      await wipeAllData(db);
                      bumpDataVersion();
                      try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      } catch {}
                      Alert.alert(Strings.common.success, Strings.exportImport.deleteAllSuccess);
                    } catch (e: any) {
                      Alert.alert(Strings.common.error, e.message || 'Wipe failed.');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{Strings.exportImport.title}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Processing...
            </Text>
          </View>
        )}

        {/* Section: CSV Export */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.exportImport.exportCsvTitle}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {Strings.exportImport.exportCsvDesc}
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleExportCsv}
            disabled={loading}
          >
            <Ionicons name="document-text-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>{Strings.exportImport.exportCsvAll}</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Full JSON Backup & Restore */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.xl }]}>
          {Strings.exportImport.backupTitle}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {Strings.exportImport.exportJsonDesc}
          </Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent, marginBottom: Spacing.sm }]}
            onPress={handleExportBackup}
            disabled={loading}
          >
            <Ionicons name="share-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>{Strings.exportImport.exportJsonButton}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.border }]}
            onPress={handlePickAndRestoreBackup}
            disabled={loading}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>
              {Strings.exportImport.importJsonButton}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: Danger Zone */}
        <Text style={[styles.sectionTitle, { color: colors.danger, marginTop: Spacing.xl }]}>
          {Strings.exportImport.dangerZone}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.danger }]}>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {Strings.exportImport.deleteAllWarning}
          </Text>
          <TouchableOpacity
            style={[styles.dangerBtn, { backgroundColor: colors.danger }]}
            onPress={handleWipeData}
            disabled={loading}
          >
            <Ionicons name="trash-bin-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>{Strings.exportImport.deleteAllData}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardDesc: {
    ...Typography.bodyMedium,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.md,
    gap: Spacing.sm,
    minHeight: 48,
  },
  actionBtnText: {
    color: '#FFF',
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 48,
  },
  actionBtnOutlineText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.md,
    gap: Spacing.sm,
    minHeight: 48,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
