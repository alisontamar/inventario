import React from 'react';
import { ReactChildren } from '../types';
export declare type GestureContextType = {
    panning: React.MutableRefObject<boolean>;
};
export declare type GestureProviderProps = {
    children: ReactChildren;
    panning?: boolean;
};
declare function GestureProvider({ children, panning }: GestureProviderProps): JSX.Element;
declare function useGesture(): GestureContextType;
export { GestureProvider, useGesture };
