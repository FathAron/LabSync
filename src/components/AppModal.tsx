import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, theme } from '../styles/theme';

type Presentation = 'responsive' | 'center' | 'bottom';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  presentation?: Presentation;
  maxWidth?: number;
}

const AppModal = ({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  presentation = 'responsive',
  maxWidth = 520,
}: AppModalProps) => {
  const { width, height } = useWindowDimensions();

  const isBottomSheet =
    presentation === 'bottom' ||
    (presentation === 'responsive' && width < 640);

  const panelWidth = isBottomSheet
    ? width
    : Math.min(maxWidth, width - spacing.xl * 2);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isBottomSheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            justifyContent: isBottomSheet ? 'flex-end' : 'center',
            paddingHorizontal: isBottomSheet ? 0 : spacing.lg,
            paddingVertical: isBottomSheet ? 0 : spacing.xl,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.panel,
            {
              width: panelWidth,
              maxHeight: height * 0.9,
            },
            isBottomSheet && styles.bottomSheet,
          ]}
        >
          {isBottomSheet ? (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          ) : null}

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>

              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={19} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  panel: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.modal,
  },
  bottomSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.mochaDark,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    padding: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});

export default AppModal;
