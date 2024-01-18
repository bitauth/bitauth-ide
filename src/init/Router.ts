import { ideImportWalletTemplate } from '../state/import-export';
import { ActionCreators } from '../state/reducer';
import { uriPayloadToString } from '../utils';

import { getRoute, Routes } from './routing';

import { connect } from 'react-redux';

const clearRoute = () => {
  window.history.pushState(null, 'Bitauth IDE', '/');
};

export const Router = connect(() => ({}), {
  attemptInvalidImport: ActionCreators.attemptInvalidImport,
  importTemplate: ActionCreators.importTemplate,
  openTemplateSettings: ActionCreators.openTemplateSettings,
  openWelcomePane: ActionCreators.openWelcomePane,
  openGuide: ActionCreators.openGuide,
})(({
  attemptInvalidImport,
  importTemplate,
  openTemplateSettings,
  openWelcomePane,
  openGuide,
}: {
  attemptInvalidImport: typeof ActionCreators.attemptInvalidImport;
  importTemplate: typeof ActionCreators.importTemplate;
  openTemplateSettings: typeof ActionCreators.openTemplateSettings;
  openWelcomePane: typeof ActionCreators.openWelcomePane;
  openGuide: typeof ActionCreators.openGuide;
}) => {
  const howToResolve = `The invalid template will now be shown in the import dialog: you can manually edit the JSON to correct any validation errors, then import the template. If you have trouble, let us know in the community chat, we're happy to help!`;

  const route = getRoute();
  if (route) {
    const payload = window.location.pathname.slice(route.length + 2);
    if (route === (Routes.directImport as string)) {
      try {
        console.log('Importing from payload:', payload);
        const uncompressed = uriPayloadToString(payload);
        console.log('Uncompressed:', uncompressed);
        const parsed = JSON.parse(uncompressed) as unknown;
        const importedTemplate = ideImportWalletTemplate(parsed);
        if (typeof importedTemplate === 'string') {
          const error = `This link may have been created manually or with an outdated version of Bitauth IDE: the link is valid, but the wallet template it encodes is not.\n\n${howToResolve}`;
          window.alert(error);
          console.error(error);
          attemptInvalidImport(uncompressed);
          return null;
        }
        setTimeout(() => {
          importTemplate(importedTemplate);
          openTemplateSettings();
        }, 0);
      } catch (e) {
        window.alert(
          'This sharing URL seems to be corrupted. Please check the link and try again.',
        );
        console.error(e);
        setTimeout(() => {
          openWelcomePane();
        }, 0);
      }
      clearRoute();
    } else if (route === (Routes.gistImport as string)) {
      const gistUrl = `https://gist.github.com/${payload}`;
      const gistApiUrl = `https://api.github.com/gists/${payload}`;
      setTimeout(() => {
        fetch(gistApiUrl)
          .then((results) => {
            return results.json();
          })
          .then((data) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (typeof data.files !== 'object' || data.files === null) {
                throw new Error(
                  `Could not find Gist. Please check the URL and try again.`,
                );
              }
              const firstFile = Object.entries(
                (data as { files: { [filename: string]: unknown } }).files,
              ).find(([filename]) => filename.endsWith('.json'));
              if (!firstFile) {
                throw new Error(
                  `No file ending in '.json' found – please confirm the Gist has a valid wallet template in JSON format.`,
                );
              }
              const [filename, file] = firstFile;
              if (
                typeof file !== 'object' ||
                file === null ||
                typeof (file as { content?: string }).content !== 'string'
              ) {
                throw new Error(
                  `Unexpected response from GitHub, returned file (${filename}) object: ${JSON.stringify(
                    file,
                  )}`,
                );
              }
              const content = (file as { content: string }).content;
              console.log(
                `Importing '${filename}' from ${gistUrl} as an wallet template.`,
              );
              const template = ideImportWalletTemplate(JSON.parse(content));
              if (typeof template === 'string') {
                const error = `There is a problem with the imported GitHub Gist: this wallet template has validation errors. It may have been created manually or with an outdated version of Bitauth IDE.\n\n${howToResolve}`;
                window.alert(error);
                console.error(error);
                console.log('Template import error:', template);
                attemptInvalidImport(content);
                return null;
              }
              importTemplate(template);
              openTemplateSettings();
            } catch (e) {
              const error = `There was a problem importing the template from the GitHub Gist (${gistUrl}): (Error: ${e})`;
              window.alert(error);
              console.error(error);
              openWelcomePane();
            }
          })
          .catch((e) => {
            const error = `Could not reach GitHub to download the requested Gist (${gistApiUrl}). Please try again when connectivity is restored.`;
            window.alert(error);
            console.error(error, 'Error:', e);
            openWelcomePane();
          });
      }, 0);
    } else if (route === (Routes.guide as string)) {
      openGuide();
    } else {
      console.log('Cleared unknown route:', route);
    }
    clearRoute();
  }

  return null;
});
