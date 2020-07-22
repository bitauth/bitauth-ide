/// <reference types="cypress" />

// TODO: update project on resolution of: https://github.com/cypress-io/instrument-cra/issues/132

describe('App', function () {
  beforeEach(function () {
    cy.visit('/');
  });

  it('renders the welcome pane', function () {
    cy.get('.bitauth').should('contain', 'bitauth');
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.percySnapshot('WelcomePane');
  });

  it('loads the single signature template', function () {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.contains('Single Signature (P2PKH)').click();
    cy.get('.EditorPane').should('contain', 'Single Signature (P2PKH)');
    cy.contains('Unlock').click();
    cy.get('.ScriptEditor > .title').contains('Unlock');
    cy.get('.ScriptEditor > .editor').contains('schnorr_signature');
    cy.percySnapshot('Single Signature (Unlock)');
  });
});
