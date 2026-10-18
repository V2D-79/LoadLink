// metro.config.js
// Firebase JS SDK uses .cjs files that Metro does not resolve by default.
// This config adds 'cjs' to the list of source extensions Metro will bundle,
// and disables the unstable package exports resolver that conflicts with
// Firebase's module structure.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Firebase JS SDK .cjs file resolution
config.resolver.sourceExts.push('cjs');

// Disable package exports to force Metro to use the "main"/"react-native" fields
// This prevents conflicts with Firebase's conditional exports
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
