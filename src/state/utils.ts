/**
 * For client-side use only.
 *
 * From https://stackoverflow.com/a/2117523
 */
export const createInsecureUuidV4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (match) => {
    const rand = (Math.random() * 16) | 0;
    const value = (match as 'x' | 'y') === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
