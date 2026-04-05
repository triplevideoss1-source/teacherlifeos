import React from 'react';
import { Language, AppState } from '../types';
import { translations, useTranslation } from '../lib/translations';
import { Check, Globe, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface OnboardingProps {
  state: AppState;
  updateState: (newState: AppState) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ state, updateState }) => {
  const { t } = useTranslation(state.language);

  const languages: { code: Language; name: string; native: string }[] = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
  ];

  const handleComplete = () => {
    updateState({ ...state, onboardingCompleted: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-8 sm:p-12 text-center"
      >
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Globe className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          {t('onboardingTitle')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm font-medium leading-relaxed">
          {t('onboardingSubtitle')}
        </p>

        <div className="grid grid-cols-1 gap-4 mb-10">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => updateState({ ...state, language: lang.code })}
              className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all group ${
                state.language === lang.code
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10'
                  : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/30'
              }`}
            >
              <div className="text-left">
                <div className={`font-black text-sm uppercase tracking-widest ${
                  state.language === lang.code ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {lang.native}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {lang.name}
                </div>
              </div>
              {state.language === lang.code && (
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleComplete}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg active:scale-95"
        >
          {t('getStarted')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};

export default Onboarding;
