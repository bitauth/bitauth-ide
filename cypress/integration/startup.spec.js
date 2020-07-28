/// <reference types="cypress" />

describe('Startup', function () {
  it('displays an error on browsers without BigInt support', function () {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.BigInt = undefined;
      },
    });
    cy.on('window:alert', (str) => {
      expect(str).to.equal(
        'Sorry, Bitauth IDE requires native BigInt support in your browser to work properly.\n\nPlease try visiting on a desktop using Chrome, Firefox, or Opera. (Note, because alternative iOS browsers use Safari internally, these browsers do not support BigInt on iOS.)'
      );
    });
    cy.contains('Bitauth IDE on GitHub');
  });

  it('can load VMs and crypto manually (in Cypress)', function () {
    cy.visit('/');
    cy.startBitauthIDE();
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
  });

  it('can load VMs and crypto automatically', function () {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.allowAutomaticLoadingOfVmsAndCrypto = true;
      },
    });
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
  });
});
