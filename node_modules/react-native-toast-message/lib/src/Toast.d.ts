import React from 'react';
import { ToastProps, ToastShowParams } from './types';
export declare function Toast(props: ToastProps): React.ReactElement;
export declare namespace Toast {
    var show: (params: ToastShowParams) => void;
    var hide: (params?: void | undefined) => void;
}
