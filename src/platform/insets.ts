// [DESKTOP] No PC não existe "notch" nem barra de gestos: as margens de segurança são sempre zero.
// Mantém a mesma API do react-native-safe-area-context para as telas não precisarem mudar.
const ZERO_INSETS = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 });

export function useSafeAreaInsets() {
  return ZERO_INSETS;
}
