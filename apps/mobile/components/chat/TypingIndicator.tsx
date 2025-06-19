import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, Layout } from '../../constants';

interface TypingIndicatorProps {
  text: string;
  visible: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
}

export default function TypingIndicator({
  text,
  visible,
  showAvatar = false,
  avatarUrl,
}: TypingIndicatorProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.messageContainer}>
        <View style={styles.bubbleContainer}>
          <View style={styles.bubble}>
            <TypingDots />
          </View>
        </View>
        
        <Text style={styles.typingText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 200),
      createDotAnimation(dot3, 400),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [dot1, dot2, dot3]);

  const getDotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
  },

  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },

  bubbleContainer: {
    maxWidth: '80%',
  },

  bubble: {
    backgroundColor: Colors.neutral[100],
    borderRadius: Layout.radius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text.secondary,
  },

  typingText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginLeft: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },
});