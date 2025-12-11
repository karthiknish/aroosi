/**
 * Subscription Screen - Premium subscription management
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
    getSubscription,
    getPlans,
    createCheckoutSession,
    type Subscription,
    type SubscriptionPlan,
} from '../../services/api/subscription';

interface SubscriptionScreenProps {
    onBack?: () => void;
}

export default function SubscriptionScreen({ onBack }: SubscriptionScreenProps) {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('yearly');

    // Load subscription data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            const [subRes, plansRes] = await Promise.all([
                getSubscription(),
                getPlans(),
            ]);

            if (subRes.data) {
                setSubscription(subRes.data);
            }

            if (plansRes.data) {
                setPlans(plansRes.data);
            }
        } catch (err) {
            console.error('Failed to load subscription:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle subscribe
    const handleSubscribe = useCallback(async (planId: string) => {
        try {
            const response = await createCheckoutSession(planId, selectedBilling === 'yearly');

            if (response.error) {
                Alert.alert('Error', response.error);
                return;
            }

            // In a real app, this would open the App Store / Play Store subscription flow
            Alert.alert('Coming Soon', 'In-app purchases will be available soon!');
        } catch (err) {
            Alert.alert('Error', 'Failed to start subscription');
        }
    }, [selectedBilling]);

    const isPremium = subscription && subscription.tier !== 'free';

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Subscription</Text>
                    <View style={styles.headerRight} />
                </View>
                <LoadingSpinner message="Loading plans..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Subscription</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <Text style={styles.heroIcon}>💎</Text>
                    <Text style={styles.heroTitle}>
                        {isPremium ? 'You\'re a Premium Member!' : 'Upgrade to Premium'}
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        {isPremium
                            ? `Your ${subscription?.tier} plan is active`
                            : 'Get unlimited likes, see who likes you, and more!'
                        }
                    </Text>
                </View>

                {/* Current Subscription */}
                {isPremium && subscription && (
                    <View style={styles.currentPlan}>
                        <Text style={styles.currentPlanTitle}>Current Plan</Text>
                        <View style={styles.currentPlanCard}>
                            <Text style={styles.planName}>{subscription.tier.toUpperCase()}</Text>
                            <Text style={styles.planStatus}>
                                {subscription.status === 'active' ? '✓ Active' : subscription.status}
                            </Text>
                            {subscription.endDate && (
                                <Text style={styles.planExpiry}>
                                    Renews {new Date(subscription.endDate).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Billing Toggle */}
                {!isPremium && (
                    <View style={styles.billingToggle}>
                        <TouchableOpacity
                            style={[
                                styles.billingOption,
                                selectedBilling === 'monthly' && styles.billingOptionActive
                            ]}
                            onPress={() => setSelectedBilling('monthly')}
                        >
                            <Text style={[
                                styles.billingText,
                                selectedBilling === 'monthly' && styles.billingTextActive
                            ]}>
                                Monthly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.billingOption,
                                selectedBilling === 'yearly' && styles.billingOptionActive
                            ]}
                            onPress={() => setSelectedBilling('yearly')}
                        >
                            <Text style={[
                                styles.billingText,
                                selectedBilling === 'yearly' && styles.billingTextActive
                            ]}>
                                Yearly
                            </Text>
                            <View style={styles.saveBadge}>
                                <Text style={styles.saveText}>Save 40%</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Plans */}
                {!isPremium && plans.length > 0 && (
                    <View style={styles.plansSection}>
                        {plans.filter(p => p.tier !== 'free').map((plan) => (
                            <View
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    plan.popular && styles.planCardPopular
                                ]}
                            >
                                {plan.popular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularText}>Most Popular</Text>
                                    </View>
                                )}
                                <Text style={styles.planTier}>{plan.name}</Text>
                                <View style={styles.priceRow}>
                                    <Text style={styles.price}>
                                        {plan.price.currency}
                                        {selectedBilling === 'yearly'
                                            ? (plan.price.yearly / 12).toFixed(2)
                                            : plan.price.monthly
                                        }
                                    </Text>
                                    <Text style={styles.priceInterval}>/month</Text>
                                </View>
                                {selectedBilling === 'yearly' && (
                                    <Text style={styles.billedYearly}>
                                        Billed {plan.price.currency}{plan.price.yearly}/year
                                    </Text>
                                )}
                                <View style={styles.featuresList}>
                                    {plan.features.map((feature, index) => (
                                        <View key={index} style={styles.featureItem}>
                                            <Text style={styles.featureCheck}>✓</Text>
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.subscribeButton,
                                        plan.popular && styles.subscribeButtonPopular
                                    ]}
                                    onPress={() => handleSubscribe(plan.id)}
                                >
                                    <Text style={[
                                        styles.subscribeButtonText,
                                        plan.popular && styles.subscribeButtonTextPopular
                                    ]}>
                                        Get {plan.name}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Features */}
                <View style={styles.featuresSection}>
                    <Text style={styles.featuresTitle}>Premium Features</Text>
                    <View style={styles.featuresGrid}>
                        {[
                            { icon: '❤️', title: 'Unlimited Likes', desc: 'Like as many people as you want' },
                            { icon: '👀', title: 'See Who Likes You', desc: 'Know who\'s interested in you' },
                            { icon: '⭐', title: 'Super Likes', desc: 'Stand out from the crowd' },
                            { icon: '🔄', title: 'Rewind', desc: 'Go back to profiles you passed' },
                            { icon: '🎯', title: 'Boost', desc: 'Get more visibility' },
                            { icon: '🌍', title: 'Global Mode', desc: 'Match anywhere in the world' },
                        ].map((feature, index) => (
                            <View key={index} style={styles.featureCard}>
                                <Text style={styles.featureIcon}>{feature.icon}</Text>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDesc}>{feature.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Restore Purchases */}
                <TouchableOpacity style={styles.restoreButton}>
                    <Text style={styles.restoreText}>Restore Purchases</Text>
                </TouchableOpacity>

                {/* Terms */}
                <Text style={styles.terms}>
                    Subscriptions auto-renew unless cancelled. Cancel anytime in Settings.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        padding: moderateScale(8),
    },
    backIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[800],
    },
    headerTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    headerRight: {
        width: moderateScale(40),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: moderateScale(32),
    },
    hero: {
        alignItems: 'center',
        padding: responsiveValues.screenPadding,
        backgroundColor: colors.primary[50],
    },
    heroIcon: {
        fontSize: moderateScale(60),
        marginBottom: moderateScale(12),
    },
    heroTitle: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(8),
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
        textAlign: 'center',
    },
    currentPlan: {
        padding: responsiveValues.cardPadding,
    },
    currentPlanTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        marginBottom: moderateScale(8),
    },
    currentPlanCard: {
        backgroundColor: colors.primary[100],
        padding: responsiveValues.cardPadding,
        borderRadius: borderRadius.xl,
    },
    planName: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    planStatus: {
        fontSize: responsiveFontSizes.sm,
        color: colors.success,
        marginTop: moderateScale(4),
    },
    planExpiry: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginTop: moderateScale(4),
    },
    billingToggle: {
        flexDirection: 'row',
        marginHorizontal: responsiveValues.screenPadding,
        marginVertical: moderateScale(16),
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        padding: moderateScale(4),
    },
    billingOption: {
        flex: 1,
        paddingVertical: moderateScale(12),
        alignItems: 'center',
        borderRadius: borderRadius.lg,
    },
    billingOptionActive: {
        backgroundColor: colors.background.light,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    billingText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
    },
    billingTextActive: {
        color: colors.neutral[900],
        fontWeight: fontWeight.semibold,
    },
    saveBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: moderateScale(8),
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        marginTop: moderateScale(4),
    },
    saveText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
        fontWeight: fontWeight.semibold,
    },
    plansSection: {
        padding: responsiveValues.screenPadding,
        gap: moderateScale(16),
    },
    planCard: {
        backgroundColor: colors.background.light,
        borderRadius: borderRadius.xl,
        padding: moderateScale(20),
        borderWidth: 2,
        borderColor: colors.border.light,
    },
    planCardPopular: {
        borderColor: colors.primary.DEFAULT,
    },
    popularBadge: {
        position: 'absolute',
        top: moderateScale(-12),
        left: '50%',
        marginLeft: moderateScale(-50),
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
    },
    popularText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
        fontWeight: fontWeight.semibold,
    },
    planTier: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        textAlign: 'center',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginTop: moderateScale(8),
    },
    price: {
        fontSize: responsiveFontSizes['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    priceInterval: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        marginLeft: moderateScale(4),
    },
    billedYearly: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        textAlign: 'center',
        marginTop: moderateScale(4),
    },
    featuresList: {
        marginTop: moderateScale(16),
        gap: moderateScale(8),
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureCheck: {
        fontSize: responsiveFontSizes.base,
        color: colors.success,
        marginRight: moderateScale(8),
    },
    featureText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[700],
    },
    subscribeButton: {
        marginTop: moderateScale(16),
        paddingVertical: moderateScale(12),
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        minHeight: responsiveValues.buttonMedium,
    },
    subscribeButtonPopular: {
        backgroundColor: colors.primary.DEFAULT,
    },
    subscribeButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
    },
    subscribeButtonTextPopular: {
        color: '#FFFFFF',
    },
    featuresSection: {
        padding: responsiveValues.screenPadding,
    },
    featuresTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        marginBottom: moderateScale(16),
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    featureCard: {
        width: '47%',
        backgroundColor: colors.neutral[50],
        padding: moderateScale(12),
        borderRadius: borderRadius.lg,
    },
    featureIcon: {
        fontSize: moderateScale(24),
        marginBottom: moderateScale(8),
    },
    featureTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
        marginBottom: moderateScale(4),
    },
    featureDesc: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[500],
    },
    restoreButton: {
        alignItems: 'center',
        paddingVertical: moderateScale(16),
    },
    restoreText: {
        fontSize: responsiveFontSizes.base,
        color: colors.primary.DEFAULT,
    },
    terms: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'center',
        paddingHorizontal: responsiveValues.screenPadding,
        marginTop: moderateScale(8),
    },
});
