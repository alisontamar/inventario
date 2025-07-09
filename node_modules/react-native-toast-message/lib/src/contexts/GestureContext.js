import React from 'react';
const GestureContext = React.createContext({
    panning: { current: false }
});
function GestureProvider({ children, panning = false }) {
    const panningRef = React.useRef(panning);
    const value = { panning: panningRef };
    return (<GestureContext.Provider value={value}>{children}</GestureContext.Provider>);
}
function useGesture() {
    const ctx = React.useContext(GestureContext);
    return ctx;
}
export { GestureProvider, useGesture };
