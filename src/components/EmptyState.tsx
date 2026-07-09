import { Package, Search, FileQuestion, Inbox, Bell, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: 'package' | 'search' | 'question' | 'inbox' | 'bell' | 'users';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  package: Package,
  search: Search,
  question: FileQuestion,
  inbox: Inbox,
  bell: Bell,
  users: Users,
};

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
          <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </motion.div>
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
        </motion.div>
      </div>
      <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="mt-6 text-lg font-semibold text-slate-700 dark:text-slate-300">{title}</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">{description}</motion.p>
      {action && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          onClick={action.onClick}
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-medium hover:shadow-lg hover:scale-105 transition-all">
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
