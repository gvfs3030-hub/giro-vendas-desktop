// [DESKTOP] Substitui '@expo/vector-icons' (que depende do expo-font, indisponível no Windows).
// Usa a fonte Ionicons + o mapa de glifos do pacote react-native-vector-icons (só os arquivos de
// dados; nenhum código nativo dele é usado). A fonte precisa estar em windows/<App>/Assets/Ionicons.ttf
// — o script tools/install-into-host.mjs já faz isso.
import React from 'react';
import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import glyphMap from 'react-native-vector-icons/glyphmaps/Ionicons.json';

const FONT_FAMILY = (Platform.OS as string) === 'windows' ? 'Assets/Ionicons.ttf#Ionicons' : 'Ionicons';

export type IoniconName = keyof typeof glyphMap;

interface IconProps {
  name: IoniconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

function IoniconsBase({ name, size = 24, color = '#000', style }: IconProps) {
  const code = (glyphMap as Record<string, number>)[name];
  if (code === undefined && __DEV__) console.warn(`Ícone desconhecido: "${name}"`);
  return (
    <Text
      allowFontScaling={false}
      selectable={false}
      style={[
        {
          fontFamily: FONT_FAMILY, fontSize: size, color, lineHeight: size, width: size,
          textAlign: 'center', fontWeight: 'normal', fontStyle: 'normal',
        },
        style,
      ]}
    >
      {code === undefined ? '' : String.fromCodePoint(code)}
    </Text>
  );
}

// `Ionicons.glyphMap` é usado nas telas só para tipar nomes: keyof typeof Ionicons.glyphMap
export const Ionicons = Object.assign(IoniconsBase, { glyphMap });
