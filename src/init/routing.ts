/**
 * The first segment of the path to match, e.g. `/import-template/[payload]`
 * will match `import-template`, `/guide/` or `/guide` will match `guide`.
 */
export enum Routes {
  directImport = 'import-template',
  gistImport = 'import-gist',
  guide = 'guide',
}

const routeRegExp = /\/[^/]+\/?/;

/**
 * Match the first segment if the path is anything other than `/`.
 */
export const getRoute = () => {
  const path = window.location.pathname.match(routeRegExp);
  if (path !== null) {
    return path[0].replace(/\//g, '');
  }
  return undefined;
};

export const isImportRoute = () => {
  const route = getRoute();
  return route === Routes.directImport || route === Routes.gistImport;
};
