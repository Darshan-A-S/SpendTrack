const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

const patchContent = `import { requireOptionalNativeModule } from 'expo-modules-core';

const module = requireOptionalNativeModule('ExpoTopicSubscriptionModule') || {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

export default module;
`;

if (fs.existsSync(targetFile)) {
  fs.writeFileSync(targetFile, patchContent, 'utf8');
  console.log('[patch] Applied ExpoTopicSubscriptionModule fallback for Expo Go Android');
}
