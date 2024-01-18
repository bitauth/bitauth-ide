import {
  base64ToBin,
  binToBase64,
  binToUtf8,
  utf8ToBin,
} from '@bitauth/libauth';
import { deflate, inflate } from 'pako';

export const base64UrlToBase64 = (base64: string) =>
  base64.replace(/-/g, '+').replace(/_/g, '/');

export const base64toBase64Url = (base64: string) =>
  base64.replace(/\+/g, '-').replace(/\//g, '_');

export const stringToUriPayload = (content: string) =>
  base64toBase64Url(binToBase64(deflate(utf8ToBin(content))));

export const uriPayloadToString = (uriPayload: string) =>
  binToUtf8(inflate(base64ToBin(base64UrlToBase64(uriPayload))));

/**
 * For client-side use only.
 *
 * From https://stackoverflow.com/a/2117523
 */
export const createInsecureUuidV4 = () =>
  // cspell: disable-next-line
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (match) => {
    const rand = (Math.random() * 16) | 0;
    const value = (match as 'x' | 'y') === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
(window as any).utils = {
  deflate,
  inflate,
  base64UrlToBase64,
  base64toBase64Url,
  stringToUriPayload,
  uriPayloadToString,
  createInsecureUuidV4,
};

/* istanbul ignore next */
export const unknownValue = (value: never) => {
  throw new Error(
    `Received an unknown value: ${
      value as string
    }. This should have been caught by TypeScript – are your types correct?`,
  );
};
