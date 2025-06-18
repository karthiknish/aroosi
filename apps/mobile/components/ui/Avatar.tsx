import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { Colors, Layout } from '../../constants';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  online?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export default function Avatar({
  uri,
  name,
  size = 'md',
  online = false,
  style,
  imageStyle,
}: AvatarProps) {
  const dimensions = SIZES[size];
  
  const containerStyles = [
    styles.container,
    {
      width: dimensions,
      height: dimensions,
      borderRadius: dimensions / 2,
    },
    style,
  ];

  const imageStyles = [
    styles.image,
    {
      width: dimensions,
      height: dimensions,
      borderRadius: dimensions / 2,
    },
    imageStyle,
  ];

  const initialsStyle = [
    styles.initials,
    {
      fontSize: dimensions * 0.4,
    },
  ];

  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const onlineIndicatorStyle = [
    styles.onlineIndicator,
    {
      width: dimensions * 0.25,
      height: dimensions * 0.25,
      borderRadius: (dimensions * 0.25) / 2,
      borderWidth: dimensions * 0.05,
      right: dimensions * 0.05,
      bottom: dimensions * 0.05,
    },
  ];

  return (
    <View style={containerStyles}>
      {uri ? (
        <Image
          source={{ uri }}
          style={imageStyles}
          defaultSource={require('../../assets/unmatched.png')}
        />
      ) : (
        <View style={[imageStyles, styles.placeholder]}>
          {name ? (
            <Text style={initialsStyle}>{getInitials(name)}</Text>
          ) : (
            <View style={styles.defaultIcon} />
          )}
        </View>
      )}
      
      {online && <View style={onlineIndicatorStyle} />}
    </View>
  );
}

const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  
  image: {
    backgroundColor: Colors.neutral[200],
  },
  
  placeholder: {
    backgroundColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  initials: {
    color: Colors.neutral[600],
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  
  defaultIcon: {
    width: '60%',
    height: '60%',
    backgroundColor: Colors.neutral[400],
    borderRadius: Layout.radius.full,
  },
  
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: Colors.success[500],
    borderColor: Colors.background.primary,
  },
});