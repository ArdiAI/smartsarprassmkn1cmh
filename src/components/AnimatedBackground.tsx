export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-200/30 dark:bg-blue-900/10 blur-3xl animate-pulse" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-cyan-200/30 dark:bg-cyan-900/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-40 right:1/3 w-96 h-96 rounded-full bg-blue-100/20 dark:bg-blue-800/5 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}
