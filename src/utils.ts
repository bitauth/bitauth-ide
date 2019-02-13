export const unknownValue = (value: never) => {
  throw new Error(
    `Received an unknown value: ${value}. This should have been caught by TypeScript – are your types correct?`
  );
};
