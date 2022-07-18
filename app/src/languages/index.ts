import Vue from 'vue';
import VueI18n from 'vue-i18n';
import messages from './messages';

const langBrowser = navigator.language.split("-")[0];

Vue.use(VueI18n);
const i18n = new VueI18n({
  locale: langBrowser,
  fallbackLocale: 'en',
  messages,
});

export default i18n;