import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { COOKING_ACTIONS } from '@/constants/cooking-actions';
import { Post } from '@/types/post';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface TechniqueTag {
  id: string;
  label: string;
  icon: string;
  category: 'prep' | 'heat';
}

export function extractRecipeTechniqueTags(post: Post): TechniqueTag[] {
  const tagMap = new Map<string, TechniqueTag>();

  // 1. Check explicit steps
  if (post.recipe_steps && post.recipe_steps.length > 0) {
    post.recipe_steps.forEach((step) => {
      // Check explicit action property
      const stepActionId = (step as any).action;
      if (stepActionId) {
        const matched = COOKING_ACTIONS.find((a) => a.id === stepActionId);
        if (matched) {
          tagMap.set(matched.id, {
            id: matched.id,
            label: matched.label,
            icon: matched.icon,
            category: matched.category,
          });
          return;
        }
      }

      // Check step title / description text against cooking action keywords
      const stepText = `${step.title} ${step.description}`.toLowerCase();
      COOKING_ACTIONS.forEach((action) => {
        const keywords = [
          action.id,
          ...action.label.toLowerCase().split(/[\/\s]+/),
          ...(action.rules?.flatMap((r) => r.keywords) || []),
        ];
        if (keywords.some((kw) => kw.length >= 3 && stepText.includes(kw))) {
          tagMap.set(action.id, {
            id: action.id,
            label: action.label,
            icon: action.icon,
            category: action.category,
          });
        }
      });
    });
  }

  // 2. If no tags found from steps yet, check post caption or recipe title
  if (tagMap.size === 0) {
    const text = `${post.recipe_title || ''} ${post.caption || ''}`.toLowerCase();
    COOKING_ACTIONS.forEach((action) => {
      const matchKeywords = [
        action.id,
        ...action.label.toLowerCase().split(/[\/\s]+/),
      ];
      if (matchKeywords.some((kw) => kw.length >= 3 && text.includes(kw))) {
        tagMap.set(action.id, {
          id: action.id,
          label: action.label,
          icon: action.icon,
          category: action.category,
        });
      }
    });
  }

  return Array.from(tagMap.values());
}

export function RecipeTechniqueTags({ post }: { post: Post }) {
  const theme = useColorScheme() ?? 'light';
  const tags = extractRecipeTechniqueTags(post);
  const isDark = theme === 'dark';

  if (tags.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="restaurant-outline" size={12} color={isDark ? '#aaa' : '#666'} />
        <ThemedText style={[styles.headerText, { color: isDark ? '#aaa' : '#666' }]}>
          Techniques Included ({tags.length}):
        </ThemedText>
      </View>
      <View style={styles.chipsRow}>
        {tags.map((tag) => {
          const isPrep = tag.category === 'prep';
          const badgeColor = isPrep ? '#10B981' : '#FF8C00';
          const bgColor = isPrep
            ? isDark
              ? '#064E3B44'
              : '#E6F4EA'
            : isDark
            ? '#7C2D1244'
            : '#FFF3E0';

          return (
            <View key={tag.id} style={[styles.chip, { backgroundColor: bgColor, borderColor: badgeColor }]}>
              <Ionicons name={tag.icon as any} size={12} color={badgeColor} />
              <ThemedText style={[styles.chipText, { color: badgeColor }]}>
                {tag.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
