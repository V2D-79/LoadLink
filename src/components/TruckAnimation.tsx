/**
 * src/components/TruckAnimation.tsx
 *
 * Enhanced animated logistics scene with truck, clouds, sun, and trees
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Rect, Path, Circle, Ellipse, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TruckAnimation() {
  const truckPosition = useSharedValue(-120);
  const wheelRotation = useSharedValue(0);
  const cloud1Position = useSharedValue(0);
  const cloud2Position = useSharedValue(SCREEN_WIDTH * 0.6);
  const sunScale = useSharedValue(1);
  const truckBounce = useSharedValue(0);
  
  // Exhaust puffs
  const exhaust1Opacity = useSharedValue(0);
  const exhaust1Scale = useSharedValue(0.5);
  const exhaust1Y = useSharedValue(0);
  
  const exhaust2Opacity = useSharedValue(0);
  const exhaust2Scale = useSharedValue(0.5);
  const exhaust2Y = useSharedValue(0);
  
  const exhaust3Opacity = useSharedValue(0);
  const exhaust3Scale = useSharedValue(0.5);
  const exhaust3Y = useSharedValue(0);

  useEffect(() => {
    // Truck movement
    truckPosition.value = withRepeat(
      withTiming(SCREEN_WIDTH + 20, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Wheel rotation
    wheelRotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Truck bounce effect
    truckBounce.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Cloud 1 movement
    cloud1Position.value = withRepeat(
      withTiming(SCREEN_WIDTH + 100, {
        duration: 25000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Cloud 2 movement (slower)
    cloud2Position.value = withRepeat(
      withTiming(SCREEN_WIDTH + 100, {
        duration: 35000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Sun pulsing
    sunScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    
    // Exhaust puff 1
    exhaust1Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(0, withTiming(0.8, { duration: 300 })),
        withDelay(400, withTiming(0, { duration: 500 }))
      ),
      -1,
      false
    );
    exhaust1Scale.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(1.5, { duration: 1200, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
    exhaust1Y.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-25, { duration: 1200, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
    
    // Exhaust puff 2 (offset)
    exhaust2Opacity.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(0, { duration: 0 })),
        withDelay(400, withTiming(0.8, { duration: 300 })),
        withDelay(400, withTiming(0, { duration: 500 }))
      ),
      -1,
      false
    );
    exhaust2Scale.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(0.5, { duration: 0 })),
        withDelay(400, withTiming(1.5, { duration: 1200, easing: Easing.out(Easing.ease) }))
      ),
      -1,
      false
    );
    exhaust2Y.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(0, { duration: 0 })),
        withDelay(400, withTiming(-25, { duration: 1200, easing: Easing.out(Easing.ease) }))
      ),
      -1,
      false
    );
    
    // Exhaust puff 3 (offset)
    exhaust3Opacity.value = withRepeat(
      withSequence(
        withDelay(800, withTiming(0, { duration: 0 })),
        withDelay(800, withTiming(0.8, { duration: 300 })),
        withDelay(800, withTiming(0, { duration: 500 }))
      ),
      -1,
      false
    );
    exhaust3Scale.value = withRepeat(
      withSequence(
        withDelay(800, withTiming(0.5, { duration: 0 })),
        withDelay(800, withTiming(1.5, { duration: 1200, easing: Easing.out(Easing.ease) }))
      ),
      -1,
      false
    );
    exhaust3Y.value = withRepeat(
      withSequence(
        withDelay(800, withTiming(0, { duration: 0 })),
        withDelay(800, withTiming(-25, { duration: 1200, easing: Easing.out(Easing.ease) }))
      ),
      -1,
      false
    );
  }, []);

  const truckAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: truckPosition.value },
        { translateY: truckBounce.value }
      ],
    };
  });

  const wheel1Style = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${wheelRotation.value}deg` }],
    };
  });

  const wheel2Style = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${wheelRotation.value}deg` }],
    };
  });

  const cloud1Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: cloud1Position.value }],
      opacity: interpolate(
        cloud1Position.value,
        [-100, 0, SCREEN_WIDTH, SCREEN_WIDTH + 100],
        [0, 1, 1, 0]
      ),
    };
  });

  const cloud2Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: cloud2Position.value }],
      opacity: interpolate(
        cloud2Position.value,
        [-100, 0, SCREEN_WIDTH, SCREEN_WIDTH + 100],
        [0, 1, 1, 0]
      ),
    };
  });

  const sunStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sunScale.value }],
    };
  });
  
  const exhaust1Style = useAnimatedStyle(() => {
    return {
      opacity: exhaust1Opacity.value,
      transform: [
        { scale: exhaust1Scale.value },
        { translateY: exhaust1Y.value },
        { translateX: truckPosition.value + 47 }
      ],
    };
  });
  
  const exhaust2Style = useAnimatedStyle(() => {
    return {
      opacity: exhaust2Opacity.value,
      transform: [
        { scale: exhaust2Scale.value },
        { translateY: exhaust2Y.value },
        { translateX: truckPosition.value + 47 }
      ],
    };
  });
  
  const exhaust3Style = useAnimatedStyle(() => {
    return {
      opacity: exhaust3Opacity.value,
      transform: [
        { scale: exhaust3Scale.value },
        { translateY: exhaust3Y.value },
        { translateX: truckPosition.value + 47 }
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Sky gradient background */}
      <View style={styles.sky} />

      {/* Sun */}
      <Animated.View style={[styles.sun, sunStyle]}>
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Circle cx={25} cy={25} r={15} fill="#FFD700" opacity={0.9} />
          <Circle cx={25} cy={25} r={12} fill="#FFA500" />
        </Svg>
      </Animated.View>

      {/* Clouds */}
      <Animated.View style={[styles.cloud, cloud1Style, { top: 15 }]}>
        <Svg width={80} height={40} viewBox="0 0 80 40">
          <Ellipse cx={20} cy={25} rx={18} ry={12} fill="#FFFFFF" opacity={0.9} />
          <Ellipse cx={35} cy={20} rx={20} ry={15} fill="#FFFFFF" opacity={0.9} />
          <Ellipse cx={50} cy={25} rx={18} ry={12} fill="#FFFFFF" opacity={0.9} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.cloud, cloud2Style, { top: 35 }]}>
        <Svg width={70} height={35} viewBox="0 0 70 35">
          <Ellipse cx={18} cy={22} rx={15} ry={10} fill="#FFFFFF" opacity={0.85} />
          <Ellipse cx={32} cy={18} rx={18} ry={12} fill="#FFFFFF" opacity={0.85} />
          <Ellipse cx={45} cy={22} rx={15} ry={10} fill="#FFFFFF" opacity={0.85} />
        </Svg>
      </Animated.View>

      {/* Mountains in background */}
      <View style={styles.mountains}>
        <Svg width="100%" height={80} viewBox="0 0 400 80" preserveAspectRatio="none">
          <Path d="M0,80 L0,40 L50,10 L100,50 L150,20 L200,45 L250,15 L300,50 L350,25 L400,55 L400,80 Z" fill="#8BC34A" opacity={0.3} />
          <Path d="M0,80 L0,55 L60,25 L120,60 L180,35 L240,58 L300,30 L360,60 L400,45 L400,80 Z" fill="#689F38" opacity={0.4} />
        </Svg>
      </View>

      {/* Trees */}
      <View style={styles.tree1}>
        <Svg width={35} height={50} viewBox="0 0 35 50">
          <Rect x={14} y={30} width={7} height={20} fill="#6D4C41" />
          <Path d="M17.5,5 L5,30 L30,30 Z" fill="#4CAF50" />
          <Path d="M17.5,15 L8,32 L27,32 Z" fill="#66BB6A" />
        </Svg>
      </View>

      <View style={styles.tree2}>
        <Svg width={30} height={45} viewBox="0 0 30 45">
          <Rect x={12} y={28} width={6} height={17} fill="#6D4C41" />
          <Path d="M15,3 L4,28 L26,28 Z" fill="#388E3C" />
          <Path d="M15,12 L7,30 L23,30 Z" fill="#4CAF50" />
        </Svg>
      </View>

      {/* Road */}
      <View style={styles.road}>
        <View style={styles.roadLineContainer}>
          <View style={styles.roadLine} />
          <View style={[styles.roadLine, { marginLeft: 50 }]} />
          <View style={[styles.roadLine, { marginLeft: 50 }]} />
          <View style={[styles.roadLine, { marginLeft: 50 }]} />
          <View style={[styles.roadLine, { marginLeft: 50 }]} />
          <View style={[styles.roadLine, { marginLeft: 50 }]} />
        </View>
      </View>

      {/* Exhaust smoke puffs (behind truck) */}
      <Animated.View style={[styles.exhaustPuff, exhaust1Style]}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Circle cx={9} cy={9} r={8} fill="#8E8E8E" opacity={0.6} />
        </Svg>
      </Animated.View>
      
      <Animated.View style={[styles.exhaustPuff, exhaust2Style]}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Circle cx={9} cy={9} r={8} fill="#8E8E8E" opacity={0.5} />
        </Svg>
      </Animated.View>
      
      <Animated.View style={[styles.exhaustPuff, exhaust3Style]}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Circle cx={9} cy={9} r={8} fill="#8E8E8E" opacity={0.4} />
        </Svg>
      </Animated.View>

      {/* Animated Truck */}
      <Animated.View style={[styles.truck, truckAnimatedStyle]}>
        <Svg width={90} height={60} viewBox="0 0 90 60">
          <Defs>
            <LinearGradient id="truckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={COLORS.ochre} stopOpacity="1" />
              <Stop offset="100%" stopColor="#8B5A1A" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {/* Shadow */}
          <Ellipse cx={45} cy={55} rx={35} ry={5} fill="#000000" opacity={0.2} />
          
          {/* Cargo container */}
          <Rect x={3} y={15} width={45} height={27} rx={3} fill="url(#truckGrad)" stroke={COLORS.charcoal} strokeWidth={2} />
          <Rect x={8} y={20} width={15} height={12} rx={1} fill="#8B7355" opacity={0.3} />
          <Rect x={26} y={20} width={15} height={12} rx={1} fill="#8B7355" opacity={0.3} />
          
          {/* Cabin */}
          <Path d="M48 20 L48 35 L70 35 L70 25 L60 12 L48 12 Z" fill={COLORS.rust} stroke={COLORS.charcoal} strokeWidth={2} strokeLinejoin="round" />
          
          {/* Cabin detail */}
          <Path d="M50 14 L58 14 L65 23 L50 23 Z" fill="#87CEEB" opacity={0.7} stroke={COLORS.charcoal} strokeWidth={1} />
          <Rect x={50} y={25} width={18} height={9} fill={COLORS.rust} />
          
          {/* Door handle */}
          <Rect x={66} y={28} width={2} height={4} rx={1} fill={COLORS.charcoal} />
          
          {/* Headlight */}
          <Circle cx={72} cy={30} r={2} fill="#FFE082" stroke={COLORS.charcoal} strokeWidth={0.5} />
          
          {/* Exhaust pipe */}
          <Rect x={47} y={10} width={3} height={8} rx={1} fill="#505050" />
          <Ellipse cx={48.5} cy={10} rx={2} ry={1.5} fill="#505050" />
        </Svg>
        
        {/* Back wheel - rendered outside SVG so it's visible */}
        <Animated.View style={[styles.wheel, { left: 18, bottom: -7 }, wheel1Style]}>
          <Svg width={20} height={20} viewBox="0 0 20 20">
            <Circle cx={10} cy={10} r={9} fill="#2C2C2C" stroke={COLORS.charcoal} strokeWidth={1.5} />
            <Circle cx={10} cy={10} r={6} fill="#505050" />
            <Circle cx={10} cy={10} r={3} fill="#787878" />
            {/* Spokes */}
            <Path d="M10,1 L10,19 M1,10 L19,10 M3.5,3.5 L16.5,16.5 M16.5,3.5 L3.5,16.5" stroke="#787878" strokeWidth={0.8} />
          </Svg>
        </Animated.View>
        
        {/* Front wheel - rendered outside SVG so it's visible */}
        <Animated.View style={[styles.wheel, { left: 60, bottom: -7 }, wheel2Style]}>
          <Svg width={20} height={20} viewBox="0 0 20 20">
            <Circle cx={10} cy={10} r={9} fill="#2C2C2C" stroke={COLORS.charcoal} strokeWidth={1.5} />
            <Circle cx={10} cy={10} r={6} fill="#505050" />
            <Circle cx={10} cy={10} r={3} fill="#787878" />
            {/* Spokes */}
            <Path d="M10,1 L10,19 M1,10 L19,10 M3.5,3.5 L16.5,16.5 M16.5,3.5 L3.5,16.5" stroke="#787878" strokeWidth={0.8} />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Grass at bottom */}
      <View style={styles.grass} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    marginVertical: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#87CEEB',
  },
  sun: {
    position: 'absolute',
    top: 20,
    right: 30,
  },
  cloud: {
    position: 'absolute',
    left: -100,
  },
  mountains: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  tree1: {
    position: 'absolute',
    bottom: 55,
    left: 30,
  },
  tree2: {
    position: 'absolute',
    bottom: 55,
    right: 50,
  },
  road: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#424242',
    borderTopWidth: 2,
    borderTopColor: '#616161',
  },
  roadLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10,
  },
  roadLine: {
    width: 50,
    height: 4,
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  truck: {
    position: 'absolute',
    bottom: 28,
    left: -120,
  },
  wheel: {
    position: 'absolute',
    zIndex: 10,
  },
  exhaustPuff: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    zIndex: 1,
  },
  grass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: '#7CB342',
  },
});
