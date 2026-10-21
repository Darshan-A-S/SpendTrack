import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCategories } from '../../hooks/useCategories';
import { useThemeColor } from '../../hooks/useThemeColor';
import { AVAILABLE_ICONS, AVAILABLE_COLORS, OTHER_CATEGORY_ID } from '../../constants/categories';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

export default function CategoryEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const { colors } = useThemeColor();
  const { categories, addCategory, updateCategory } = useCategories(true);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (isEditing && params.id) {
      const existing = categories.find((c) => c.id === params.id);
      if (existing) {
        setName(existing.name);
        setSelectedColor(existing.color);
        setSelectedIcon(existing.icon);
      }
    }
  }, [isEditing, params.id, categories]);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(Strings.categories.nameRequired);
      return;
    }

    if (isEditing && params.id === OTHER_CATEGORY_ID) {
      Alert.alert(Strings.common.warning, Strings.categories.cannotModifyOther);
      return;
    }

    try {
      if (isEditing && params.id) {
        await updateCategory({
          id: params.id,
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon,
        });
      } else {
        await addCategory({
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon,
        });
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.back();
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'Could not save category');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? Strings.categories.editCategory : Strings.categories.addCategory}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{Strings.common.save}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Preview Bubble */}
        <View style={styles.previewContainer}>
          <View style={[styles.previewBubble, { backgroundColor: selectedColor }]}>
            <Ionicons name={(selectedIcon as any) || 'pricetag-outline'} size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.previewName, { color: colors.text }]}>
            {name.trim() || 'Category Name'}
          </Text>
        </View>

        {/* Name Input */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.categories.nameLabel}
        </Text>
        <View
          style={[
            styles.inputField,
            {
              backgroundColor: colors.card,
              borderColor: nameError ? colors.danger : colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(undefined);
            }}
            placeholder={Strings.categories.namePlaceholder}
            placeholderTextColor={colors.textMuted}
            autoFocus={!isEditing}
          />
        </View>
        {nameError ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{nameError}</Text>
        ) : null}

        {/* Color Palette */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
          {Strings.categories.colorLabel}
        </Text>
        <View style={styles.paletteGrid}>
          {AVAILABLE_COLORS.map((c) => {
            const isSelected = selectedColor === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  isSelected && styles.selectedCircle,
                ]}
                onPress={() => setSelectedColor(c)}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Icon Grid */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
          {Strings.categories.iconLabel}
        </Text>
        <View style={styles.iconGrid}>
          {AVAILABLE_ICONS.map((ic) => {
            const isSelected = selectedIcon === ic;
            return (
              <TouchableOpacity
                key={ic}
                style={[
                  styles.iconOption,
                  {
                    backgroundColor: isSelected ? `${selectedColor}25` : colors.card,
                    borderColor: isSelected ? selectedColor : colors.border,
                  },
                ]}
                onPress={() => setSelectedIcon(ic)}
              >
                <Ionicons
                  name={ic as any}
                  size={22}
                  color={isSelected ? selectedColor : colors.text}
                />
              </TouchableOpacity>
            );
          })}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  previewBubble: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  previewName: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inputField: {
    borderRadius: Radii.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  textInput: {
    ...Typography.bodyMedium,
    paddingVertical: 8,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: 4,
    marginLeft: 4,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
