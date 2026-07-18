import { cn } from '../utils/cn';

export default function AnimatedBackground({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
    </div>
  );
}
