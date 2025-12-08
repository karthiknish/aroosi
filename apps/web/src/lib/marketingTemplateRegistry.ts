// Lightweight, extensible registry for marketing email template renderers.
// Consumers can register custom templates at startup (server-only).

export type TemplateRenderer = (
  args: any,
  context: { profile?: any; unsubscribeToken?: string }
) => { subject: string; html: string } | null;

const registry = new Map<string, TemplateRenderer>();

export function registerTemplate(key: string, renderer: TemplateRenderer) {
  registry.set(key, renderer);
}

export function getTemplateRenderer(key: string): TemplateRenderer | undefined {
  return registry.get(key);
}

export function renderTemplate(
  key: string,
  args: any,
  context: { profile?: any; unsubscribeToken?: string }
) {
  const r = registry.get(key);
  if (!r) return null;
  return r(args, context);
}
