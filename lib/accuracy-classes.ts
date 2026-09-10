/**
 * Canonical accuracy classes used across legal metrology instruments.
 * Weighing instruments use OIML R76 classes (I/II/III/IIII); flow/dispensing
 * instruments use R117-style numeric classes. Kept in one place so every
 * accuracy-class dropdown offers the same options.
 */
export const ACCURACY_CLASSES = [
  "Class I",
  "Class II",
  "Class III",
  "Class IIII",
  "Class 0.1",
  "Class 0.2",
  "Class 0.5",
  "Class 1.0",
  "Class 1.5",
  "Class 2.5",
] as const;

export type AccuracyClass = (typeof ACCURACY_CLASSES)[number];
