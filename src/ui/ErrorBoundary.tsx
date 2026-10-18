/**
 * src/ui/ErrorBoundary.tsx
 *
 * React error boundary for the root of the app.
 * Shows a friendly error screen with a retry button.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII, MIN_TOUCH_TARGET } from '../constants/theme';
import { APP_NAME } from '../constants/app';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this would go to Sentry / Crashlytics
    console.error('[ErrorBoundary]', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.heading}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Your data is safe.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.devError}>
              <Text style={styles.devErrorText}>{this.state.error.message}</Text>
            </View>
          )}
          <Pressable
            onPress={this.handleRetry}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  appName: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.ochre,
    marginBottom: SPACING.xl,
  },
  heading: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.offWhite,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.md,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  devError: {
    backgroundColor: COLORS.brick + '30',
    borderWidth: 1,
    borderColor: COLORS.brick,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  devErrorText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brick,
  },
  retryButton: {
    backgroundColor: COLORS.ochre,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.paperWhite,
  },
});
