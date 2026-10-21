import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../db/repositories/categoryRepo';
import { useThemeColor } from '../hooks/useThemeColor';
import { Spacing, Radii, Typography } from '../constants/theme';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  error?: string;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  error,
}) => {
  const { colors } = useThemeColor();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? `${cat.color}25` : colors.card,
                  borderColor: isSelected ? cat.color : colors.border,
                },
              ]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Category ${cat.name}`}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${cat.color}20` },
                ]}
              >
                <Ionicons
                  name={(cat.icon as any) || 'pricetag-outline'}
                  size={18}
                  color={cat.color}
                />
              </View>
              <Text
                style={[
                  styles.categoryName,
                  {
                    color: isSelected ? cat.color : colors.text,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    minHeight: 44,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs + 2,
  },
  categoryName: {
    ...Typography.bodyMedium,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
});
