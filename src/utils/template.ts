export function applyNameTemplate(template: string, username: string): string {
  return template.replace(/\{username\}/g, username);
}
