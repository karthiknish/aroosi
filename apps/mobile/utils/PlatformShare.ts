import { Platform, Share, Alert } from 'react-native';

export interface ShareContent {
  title?: string;
  message?: string;
  url?: string;
  subject?: string; // Android only
}

export interface ShareOptions {
  dialogTitle?: string; // Android only
  excludedActivityTypes?: string[]; // iOS only
  tintColor?: string; // iOS only
}

export interface ShareResult {
  success: boolean;
  activityType?: string; // iOS only
  error?: string;
}

class PlatformShare {
  static async share(content: ShareContent, options: ShareOptions = {}): Promise<ShareResult> {
    try {
      if (Platform.OS === 'ios') {
        return await PlatformShare.shareIOS(content, options);
      } else {
        return await PlatformShare.shareAndroid(content, options);
      }
    } catch (error) {
      console.error('Share failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private static async shareIOS(content: ShareContent, options: ShareOptions): Promise<ShareResult> {
    const shareContent: any = {};
    
    if (content.message) shareContent.message = content.message;
    if (content.url) shareContent.url = content.url;
    if (content.title) shareContent.title = content.title;

    const shareOptions: any = {};
    if (options.excludedActivityTypes) {
      shareOptions.excludedActivityTypes = options.excludedActivityTypes;
    }
    if (options.tintColor) {
      shareOptions.tintColor = options.tintColor;
    }

    const result = await Share.share(shareContent, shareOptions);

    return {
      success: result.action === Share.sharedAction,
      activityType: result.activityType,
    };
  }

  private static async shareAndroid(content: ShareContent, options: ShareOptions): Promise<ShareResult> {
    const shareContent: any = {};
    
    if (content.title) shareContent.title = content.title;
    if (content.message) shareContent.message = content.message;
    if (content.url) {
      shareContent.message = content.message 
        ? `${content.message}\n\n${content.url}` 
        : content.url;
    }
    if (content.subject) shareContent.subject = content.subject;

    const shareOptions: any = {};
    if (options.dialogTitle) {
      shareOptions.dialogTitle = options.dialogTitle;
    }

    const result = await Share.share(shareContent, shareOptions);

    return {
      success: result.action === Share.sharedAction,
    };
  }

  // Convenience methods for common sharing scenarios
  static async shareText(text: string, title?: string): Promise<ShareResult> {
    return PlatformShare.share({
      message: text,
      title: title || 'Share',
    });
  }

  static async shareUrl(url: string, title?: string, message?: string): Promise<ShareResult> {
    return PlatformShare.share({
      url,
      title: title || 'Share Link',
      message,
    });
  }

  static async shareProfile(profileUrl: string, name: string): Promise<ShareResult> {
    const message = `Check out ${name}'s profile on Aroosi`;
    
    return PlatformShare.share({
      title: 'Share Profile',
      message: Platform.OS === 'ios' ? message : `${message}\n\n${profileUrl}`,
      url: Platform.OS === 'ios' ? profileUrl : undefined,
    }, {
      dialogTitle: 'Share Profile',
    });
  }

  static async shareApp(): Promise<ShareResult> {
    const appUrl = Platform.select({
      ios: 'https://apps.apple.com/app/aroosi',
      android: 'https://play.google.com/store/apps/details?id=com.aroosi.app',
    }) || 'https://aroosi.com';

    const message = 'Find your perfect match on Aroosi - the Afghan matrimony app';

    return PlatformShare.share({
      title: 'Share Aroosi',
      message: Platform.OS === 'ios' ? message : `${message}\n\n${appUrl}`,
      url: Platform.OS === 'ios' ? appUrl : undefined,
    }, {
      dialogTitle: 'Share Aroosi App',
    });
  }

  // Check if sharing is available
  static isAvailable(): boolean {
    return Share !== undefined;
  }
}

export default PlatformShare;