export function cls(...inputs: (string | false | null | undefined)[]): string { return inputs.filter(Boolean).join(' '); }
