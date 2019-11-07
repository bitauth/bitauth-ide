export enum Routes {
  directImport = '/import-template/',
  gistImport = '/import-gist/'
}

const routeRegExp = /\/[^/]+\/?/;

/**
 * Match the first segment if the path is anything other than `/`.
 */
export const getRoute = () => {
  const path = window.location.pathname.match(routeRegExp);
  if (path !== null) {
    return path[0];
  }
  return undefined;
};

export const isImportRoute = () => {
  const route = getRoute();
  return route === Routes.directImport || route === Routes.gistImport;
};
