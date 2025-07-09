import React from 'react';
import { PanResponder } from 'react-native';
export function startShouldSetPanResponder() {
    return true;
}
export function moveShouldSetPanResponder(_event, gesture) {
    const { dx, dy } = gesture;
    // Fixes onPress handler
    // https://github.com/calintamas/react-native-toast-message/issues/113
    const offset = 2;
    return Math.abs(dx) > offset || Math.abs(dy) > offset;
}
export function shouldDismissView(newAnimatedValue, gesture) {
    const dismissThreshold = 0.65;
    const { vy, dy } = gesture;
    return (newAnimatedValue <= dismissThreshold ||
        (Math.abs(vy) >= dismissThreshold && dy < 0));
}
export function usePanResponder({ animatedValue, computeNewAnimatedValueForGesture, onDismiss, onRestore, onStart, onEnd, disable }) {
    const onGrant = React.useCallback(() => {
        if (disable)
            return;
        onStart();
    }, [onStart, disable]);
    const onMove = React.useCallback((_event, gesture) => {
        if (disable)
            return;
        const newAnimatedValue = computeNewAnimatedValueForGesture(gesture);
        animatedValue.current?.setValue(newAnimatedValue);
    }, [animatedValue, computeNewAnimatedValueForGesture, disable]);
    const onRelease = React.useCallback((_event, gesture) => {
        if (disable)
            return;
        const newAnimatedValue = computeNewAnimatedValueForGesture(gesture);
        onEnd();
        if (shouldDismissView(newAnimatedValue, gesture)) {
            onDismiss();
        }
        else {
            onRestore();
        }
    }, [computeNewAnimatedValueForGesture, onEnd, onDismiss, onRestore, disable]);
    const panResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: startShouldSetPanResponder,
        onPanResponderGrant: onGrant,
        onMoveShouldSetPanResponder: moveShouldSetPanResponder,
        onMoveShouldSetPanResponderCapture: moveShouldSetPanResponder,
        onPanResponderMove: onMove,
        onPanResponderRelease: onRelease
    }), [onMove, onRelease, onGrant]);
    return {
        panResponder,
        onGrant,
        onMove,
        onRelease,
    };
}
