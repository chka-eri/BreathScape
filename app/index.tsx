import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SCREEN = Dimensions.get('window');
const CIRCLE_MAX = Math.min(SCREEN.width * 0.55, 220);

type Pattern = {
  id: string;
  label: string;
  phases: { label: string; duration: number; icon: string }[];
};

const PATTERNS: Pattern[] = [
  {
    id: 'box',
    label: 'Box Breathing',
    phases: [
      { label: 'Breathe In', duration: 4, icon: 'arrow-up-circle' },
      { label: 'Hold', duration: 4, icon: 'pause-circle' },
      { label: 'Breathe Out', duration: 4, icon: 'arrow-down-circle' },
      { label: 'Hold', duration: 4, icon: 'pause-circle' },
    ],
  },
  {
    id: '478',
    label: '4-7-8',
    phases: [
      { label: 'Breathe In', duration: 4, icon: 'arrow-up-circle' },
      { label: 'Hold', duration: 7, icon: 'pause-circle' },
      { label: 'Breathe Out', duration: 8, icon: 'arrow-down-circle' },
    ],
  },
  {
    id: 'relaxing',
    label: 'Relaxing',
    phases: [
      { label: 'Breathe In', duration: 4, icon: 'arrow-up-circle' },
      { label: 'Hold', duration: 2, icon: 'pause-circle' },
      { label: 'Breathe Out', duration: 6, icon: 'arrow-down-circle' },
    ],
  },
  {
    id: 'calm',
    label: 'Calm',
    phases: [
      { label: 'Breathe In', duration: 5, icon: 'arrow-up-circle' },
      { label: 'Breathe Out', duration: 5, icon: 'arrow-down-circle' },
    ],
  },
];

const lightColors: Record<string, string> = {
  bg: '#E8F4F8',
  bgSecondary: '#D0ECF4',
  text: '#1A2E3E',
  textSecondary: '#5A7A8A',
  primary: '#4A9BB5',
  primaryGlow: 'rgba(74,155,181,0.15)',
  circleBg: 'rgba(74,155,181,0.08)',
  circleBorder: '#4A9BB5',
  accent: '#7EC8D8',
  accentGlow: 'rgba(126,200,216,0.2)',
  chipBg: 'rgba(74,155,181,0.08)',
  chipActive: '#4A9BB5',
  chipText: '#5A7A8A',
  chipTextActive: '#FFFFFF',
  phaseText: '#4A9BB5',
  white: '#FFFFFF',
};

const darkColors: Record<string, string> = {
  bg: '#0D1B2A',
  bgSecondary: '#14283A',
  text: '#E0EAF0',
  textSecondary: '#6A8A9A',
  primary: '#6EC8E0',
  primaryGlow: 'rgba(110,200,224,0.12)',
  circleBg: 'rgba(110,200,224,0.06)',
  circleBorder: '#6EC8E0',
  accent: '#4A9BB5',
  accentGlow: 'rgba(74,155,181,0.15)',
  chipBg: 'rgba(110,200,224,0.08)',
  chipActive: '#6EC8E0',
  chipText: '#6A8A9A',
  chipTextActive: '#0D1B2A',
  phaseText: '#6EC8E0',
  white: '#FFFFFF',
};

function ScaleButton({
  onPress, style, children, haptic, ...props
}: {
  onPress?: () => void;
  style?: any;
  children: React.ReactNode;
  haptic?: boolean;
  [key: string]: any;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={() => { if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
        onPressIn={() => { scale.value = withTiming(0.93, { duration: 80 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 80 }); }}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const [patternIndex, setPatternIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartRef = useRef(Date.now());
  const phaseRef = useRef(0);
  const patternRef = useRef(0);

  phaseRef.current = currentPhase;
  patternRef.current = patternIndex;

  const pattern = PATTERNS[patternIndex];

  const circleScale = useSharedValue(0.4);

  const tickRef = useRef(() => {});
  tickRef.current = () => {
    const now = Date.now();
    const elapsed = (now - phaseStartRef.current) / 1000;
    const phaseDurations = PATTERNS[patternRef.current].phases;
    const curPhase = phaseRef.current;
    const dur = phaseDurations[curPhase]?.duration || 4;
    const progress = Math.min(1, elapsed / dur);

    setPhaseProgress(progress);

    if (progress >= 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextPhase = (curPhase + 1) % phaseDurations.length;
      if (nextPhase === 0) {
        setCycleCount((c) => c + 1);
      }
      setCurrentPhase(nextPhase);
      phaseStartRef.current = now;
      const nextLabel = phaseDurations[nextPhase]?.label || '';
      const prevLabel = phaseDurations[curPhase]?.label || '';
      let target = 0.4;
      if (nextLabel === 'Breathe In') target = 1;
      else if (nextLabel === 'Breathe Out') target = 0.4;
      else if (nextLabel === 'Hold') target = prevLabel === 'Breathe In' ? 1 : 0.4;
      circleScale.value = withTiming(target, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });
      setPhaseProgress(0);
    } else {
      const label = phaseDurations[curPhase]?.label;
      let target = 0.4;
      if (label === 'Breathe In') target = 0.4 + progress * 0.6;
      else if (label === 'Breathe Out') target = 1 - progress * 0.6;
      else if (label === 'Hold') {
        let i = curPhase - 1;
        while (i >= 0 && phaseDurations[i]?.label === 'Hold') i--;
        target = phaseDurations[i]?.label === 'Breathe In' ? 1 : 0.4;
      }
      circleScale.value = withTiming(target, {
        duration: 50,
        easing: Easing.linear,
      });
    }
  };

  const startSession = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsActive(true);
    setCurrentPhase(0);
    setPhaseProgress(0);
    setCycleCount(0);
    phaseStartRef.current = Date.now();
    circleScale.value = withTiming(0.4, { duration: 200 });
    timerRef.current = setInterval(() => tickRef.current(), 60);
  };

  const stopSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setPhaseProgress(0);
    circleScale.value = withTiming(0.4, { duration: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const circleAnimStyle = useAnimatedStyle(() => ({
    width: CIRCLE_MAX,
    height: CIRCLE_MAX,
    borderRadius: CIRCLE_MAX / 2,
    transform: [{ scale: circleScale.value }],
  }));

  const innerCircleAnimStyle = useAnimatedStyle(() => ({
    width: CIRCLE_MAX,
    height: CIRCLE_MAX,
    borderRadius: CIRCLE_MAX / 2,
    transform: [{ scale: circleScale.value * 0.7 }],
  }));

  const phase = pattern.phases[currentPhase];
  const totalCycleDuration = pattern.phases.reduce((s, p) => s + p.duration, 0);
  const totalElapsed = pattern.phases.slice(0, currentPhase).reduce((s, p) => s + p.duration, 0) + phaseProgress * (phase?.duration || 1);

  const s = useMemo(() => ({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: 1 },
    patternRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, flexWrap: 'wrap' as any, paddingBottom: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      flexDirection: 'row' as any, alignItems: 'center', gap: 4,
    },
    centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    circleOuter: {
      width: CIRCLE_MAX, height: CIRCLE_MAX, borderRadius: CIRCLE_MAX / 2,
      backgroundColor: colors.circleBg, borderWidth: 2, borderColor: colors.circleBorder as string,
      justifyContent: 'center', alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 32 },
        android: { elevation: 8 },
      }),
    },
    circleInner: {
      width: CIRCLE_MAX * 0.6, height: CIRCLE_MAX * 0.6, borderRadius: (CIRCLE_MAX * 0.6) / 2,
      backgroundColor: colors.accentGlow,
      justifyContent: 'center', alignItems: 'center',
    },
    phaseLabel: { fontSize: 22, fontWeight: '700', color: colors.phaseText, letterSpacing: 0.5, marginTop: 24 },
    phaseTimer: { fontSize: 48, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] as any, marginTop: 4 },
    cycleInfo: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginTop: 12 },
    controls: { flexDirection: 'row' as any, justifyContent: 'center', gap: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, paddingTop: 16 },
    mainButton: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 20 },
        android: { elevation: 8 },
      }),
    },
    secondaryBtn: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.primaryGlow, justifyContent: 'center', alignItems: 'center',
    },
    phaseProgress: {
      flexDirection: 'row' as any, gap: 4, justifyContent: 'center', marginTop: 16,
    },
    phaseDot: { width: 8, height: 8, borderRadius: 4 },
  }) as Record<string, any>, [colors]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>BreathScape</Text>
              <Text style={s.headerSub}>Find your calm</Text>
            </View>
            <MaterialCommunityIcons name="flower-tulip-outline" size={24} color={colors.primary} />
          </View>
        </View>

        <View style={s.patternRow}>
          {PATTERNS.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => {
                if (!isActive) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPatternIndex(i);
                  setCurrentPhase(0);
                  setPhaseProgress(0);
                  setCycleCount(0);
                  circleScale.value = withTiming(0.4, { duration: 200 });
                }
              }}
            >
              <View style={[s.chip, { backgroundColor: patternIndex === i ? colors.chipActive : colors.chipBg }]}>
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: patternIndex === i ? colors.chipTextActive : colors.chipText,
                }}>{p.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={s.centerArea}>
          <Animated.View style={[s.circleOuter, circleAnimStyle]}>
            <Animated.View style={[s.circleInner, innerCircleAnimStyle]}>
              {isActive && (
                <Text style={{ fontSize: 28, color: colors.primary, fontWeight: '300' }}>
                  {phase?.label === 'Breathe In' ? '↑' : phase?.label === 'Breathe Out' ? '↓' : '−'}
                </Text>
              )}
            </Animated.View>
          </Animated.View>

          {isActive ? (
            <>
              <Text style={s.phaseLabel}>{phase?.label}</Text>
              <Text style={s.phaseTimer}>
                {Math.ceil((phase?.duration || 0) * (1 - phaseProgress))}
              </Text>
              <Text style={s.cycleInfo}>
                Cycle {cycleCount + 1} · {Math.floor(totalElapsed)}s of {totalCycleDuration}s
              </Text>
              <View style={s.phaseProgress}>
                {pattern.phases.map((p, i) => (
                  <View
                    key={i}
                    style={[
                      s.phaseDot,
                      {
                        backgroundColor: i < currentPhase
                          ? colors.primary
                          : i === currentPhase
                            ? colors.accent
                            : colors.primaryGlow,
                        opacity: i === currentPhase ? 1 : 0.4,
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={[s.phaseLabel, { color: colors.textSecondary as string, fontSize: 18, fontWeight: '500' }]}>
                {pattern.label}
              </Text>
              <Text style={[s.cycleInfo, { marginTop: 4 }]}>
                {pattern.phases.map((p) => p.label).join(' · ')}
              </Text>
            </>
          )}
        </View>

        <View style={s.controls}>
          {isActive ? (
            <ScaleButton onPress={stopSession} style={s.mainButton} haptic>
              <MaterialCommunityIcons name="stop" size={28} color={colors.white} />
            </ScaleButton>
          ) : (
            <ScaleButton onPress={startSession} style={s.mainButton} haptic>
              <MaterialCommunityIcons name="play" size={28} color={colors.white} />
            </ScaleButton>
          )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
