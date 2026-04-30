import QuickPicksScreen from '@/src/screens/engagement/QuickPicksScreen';

export default QuickPicksScreen;
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.optionCard,
                                        selectedSort === option.id && styles.optionCardSelected,
                                    ]}
                                    onPress={() => handleSortSelect(option.id)}
                                    activeOpacity={0.7}
                                >
                                    <SymbolView
                                        name={option.symbolName as any}
                                        weight={selectedSort === option.id ? 'semibold' : 'regular'}
                                        tintColor={selectedSort === option.id ? colors.primary.DEFAULT : colors.neutral[600]}
                                        size={24}
                                    />
                                    <Text
                                        style={[
                                            styles.optionLabel,
                                            selectedSort === option.id && styles.optionLabelSelected,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </AnimatedView>

                    {/* Interests */}
                    <AnimatedView
                        style={styles.section}
                        entering={FadeInUp.duration(300).delay(100)}
                    >
                        <Text style={styles.sectionTitle}>
                            Quick Interests ({selectedInterests.size}/5)
                        </Text>
                        <View style={styles.optionsGrid}>
                            {INTEREST_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.optionCard,
                                        selectedInterests.has(option.id) && styles.optionCardSelected,
                                    ]}
                                    onPress={() => handleInterestToggle(option.id)}
                                    activeOpacity={0.7}
                                >
                                    <SymbolView
                                        name={option.symbolName as any}
                                        weight={selectedInterests.has(option.id) ? 'semibold' : 'regular'}
                                        tintColor={selectedInterests.has(option.id) ? colors.primary.DEFAULT : colors.neutral[600]}
                                        size={24}
                                    />
                                    <Text
                                        style={[
                                            styles.optionLabel,
                                            selectedInterests.has(option.id) && styles.optionLabelSelected,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </AnimatedView>
                </ScrollView>

                {/* Footer */}
                <AnimatedView
                    style={styles.footer}
                    entering={FadeInUp.duration(300).delay(150)}
                >
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={handleApply}
                    >
                        <Text style={styles.applyButtonText}>Apply</Text>
                    </TouchableOpacity>
                </AnimatedView>
            </AnimatedView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: colors.background.light,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius['2xl'],
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        paddingTop: moderateScale(20),
        paddingBottom: moderateScale(16),
        paddingHorizontal: moderateScale(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    title: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
    },
    subtitle: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    section: {
        padding: moderateScale(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
        marginBottom: moderateScale(12),
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    optionCard: {
        width: (moderateScale(300) - moderateScale(40) - moderateScale(24)) / 2,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(12),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardSelected: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary.DEFAULT,
    },
    optionLabel: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[600],
        textAlign: 'center',
    },
    optionLabelSelected: {
        color: colors.primary.DEFAULT,
    },
    footer: {
        flexDirection: 'row',
        gap: moderateScale(12),
        padding: moderateScale(20),
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: moderateScale(14),
        borderRadius: borderRadius.lg,
        backgroundColor: colors.neutral[200],
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
    },
    applyButton: {
        flex: 1,
        paddingVertical: moderateScale(14),
        borderRadius: borderRadius.lg,
        backgroundColor: colors.primary.DEFAULT,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
