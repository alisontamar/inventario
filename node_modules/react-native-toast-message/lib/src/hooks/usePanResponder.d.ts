import { RefObject } from 'react';
import { Animated, GestureResponderEvent, PanResponderGestureState } from 'react-native';
export declare function startShouldSetPanResponder(): boolean;
export declare function moveShouldSetPanResponder(_event: GestureResponderEvent, gesture: PanResponderGestureState): boolean;
export declare function shouldDismissView(newAnimatedValue: number, gesture: PanResponderGestureState): boolean;
export declare type UsePanResponderParams = {
    animatedValue: RefObject<Animated.Value>;
    computeNewAnimatedValueForGesture: (gesture: PanResponderGestureState) => number;
    onDismiss: () => void;
    onRestore: () => void;
    onStart: () => void;
    onEnd: () => void;
    disable?: boolean;
};
export declare function usePanResponder({ animatedValue, computeNewAnimatedValueForGesture, onDismiss, onRestore, onStart, onEnd, disable }: UsePanResponderParams): {
    panResponder: import("react-native").PanResponderInstance;
    onGrant: () => void;
    onMove: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => void;
    onRelease: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => void;
};
