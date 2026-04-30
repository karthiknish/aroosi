import { router } from 'expo-router';
import PreferencesScreen from '@/src/screens/profile/PreferencesScreen';

export default function PreferencesRoute() {
    return (
        <PreferencesScreen
            onBack={() => router.back()}
            onSave={() => router.back()}
        />
    );
}
                    <Text style={styles.sectionDescription}>
                        Quick select or use slider for custom range
                    </Text>

                    <View style={styles.segmentedContainer}>
                        <SegmentedControl
                            values={AGE_RANGES}
                            selectedIndex={ageRangeIndex}
                            onChange={({ nativeEvent }) => {
                                const index = nativeEvent.selectedSegmentIndex;
                                setAgeRangeIndex(index);
                                // Update slider values based on selection
                                const ranges = [
                                    { min: 18, max: 25 },
                                    { min: 26, max: 35 },
                                    { min: 36, max: 45 },
                                    { min: 46, max: 80 },
                                ];
                                setMinAge(ranges[index].min);
                                setMaxAge(ranges[index].max);
                            }}
                            style={styles.segmentedControl}
                        />
                    </View>
                </AnimatedView>

                {/* Custom Age Range - Slider */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(200)}
                >
                    <Text style={styles.sectionTitle}>Custom Age Range</Text>
                    <Text style={styles.sectionDescription}>
                        {minAge} - {maxAge} years old
                    </Text>

                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderLabel}>18</Text>
                        <SliderComponent as any
                            style={styles.slider}
                            value={minAge}
                            onValueChange={setMinAge}
                            minimumValue={18}
                            maximumValue={maxAge - 5}
                            step={1}
                            minimumTrackTintColor={colors.primary.DEFAULT}
                            maximumTrackTintColor={colors.neutral[200]}
                            thumbTintColor={colors.primary.DEFAULT}
                        />
                        <SliderComponent as any
                            style={styles.slider}
                            value={maxAge}
                            onValueChange={setMaxAge}
                            minimumValue={minAge + 5}
                            maximumValue={80}
                            step={1}
                            minimumTrackTintColor={colors.primary.DEFAULT}
                            maximumTrackTintColor={colors.neutral[200]}
                            thumbTintColor={colors.primary.DEFAULT}
                        />
                        <Text style={styles.sliderLabel}>80+</Text>
                    </View>
                </AnimatedView>

                {/* Distance Range - Slider */}
                <AnimatedView
                    style={styles.section}
                    entering={FadeIn.duration(400).delay(250)}
                >
                    <Text style={styles.sectionTitle}>Maximum Distance</Text>
                    <Text style={styles.sectionDescription}>
                        Show people within {maxDistance} km
                    </Text>

                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderLabel}>1</Text>
                        <SliderComponent as any
                            style={styles.slider}
                            value={maxDistance}
                            onValueChange={setMaxDistance}
                            minimumValue={1}
                            maximumValue={100}
                            step={1}
                            minimumTrackTintColor={colors.primary.DEFAULT}
                            maximumTrackTintColor={colors.neutral[200]}
                            thumbTintColor={colors.primary.DEFAULT}
                        />
                        <Text style={styles.sliderLabel}>100+</Text>
                    </View>

                    <View style={styles.distanceMarkers}>
                        <Text style={styles.distanceMarker}>5 km</Text>
                        <Text style={styles.distanceMarker}>25 km</Text>
                        <Text style={styles.distanceMarker}>50 km</Text>
                        <Text style={styles.distanceMarker}>100+ km</Text>
                    </View>
                </AnimatedView>

                {/* Info Section */}
                <AnimatedView
                    style={styles.infoSection}
                    entering={FadeIn.duration(400).delay(300)}
                >
                    <SymbolView
                        name="info.circle"
                        weight="medium"
                        tintColor={colors.primary.DEFAULT}
                        size={20}
                    />
                    <Text style={styles.infoText}>
                        Your preferences help us find better matches for you.
                        You can always adjust these settings later.
                    </Text>
                </AnimatedView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        backgroundColor: colors.background.light,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        padding: moderateScale(8),
    },
    headerTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        flex: 1,
        textAlign: 'center',
        marginHorizontal: moderateScale(40),
    },
    saveButton: {
        padding: moderateScale(8),
    },
    saveButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: moderateScale(32),
    },
    section: {
        backgroundColor: colors.background.light,
        marginBottom: responsiveValues.itemSpacing,
        padding: responsiveValues.cardPadding,
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
    },
    sectionDescription: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginBottom: moderateScale(16),
    },
    segmentedContainer: {
        paddingVertical: moderateScale(8),
    },
    segmentedControl: {
        height: moderateScale(32),
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: moderateScale(8),
    },
    slider: {
        flex: 1,
        marginHorizontal: moderateScale(12),
    },
    sliderLabel: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        width: moderateScale(30),
        textAlign: 'center',
    },
    distanceMarkers: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(48),
        marginTop: moderateScale(8),
    },
    distanceMarker: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.background.light,
        marginHorizontal: responsiveValues.screenPadding,
        marginTop: moderateScale(16),
        padding: responsiveValues.cardPadding,
        borderRadius: borderRadius.lg,
        gap: moderateScale(12),
    },
    infoText: {
        flex: 1,
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        lineHeight: responsiveFontSizes.sm * 1.5,
    },
});
